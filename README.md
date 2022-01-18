# CID/CD POC

Una prueba de concepto de CI / CD de un monorepo realizada con github actions.

#### Consideraciones:
- Las versiones serán realizadas con la siguiente nomenclatura "V1.xx.xx" o "v1.xx.xx-backend" (Aunque la primera está bien, la segunda es innecesaria si se manejan los path)
- Tomar en cuenta si para deployar en main se hará al recibir un push o si solo se hará deploy al crear una nueva versión
- Front y back deben tener diferentes workflows
- Front debe deployar a  S3 y limpiar la carpeta antes de updatear el nuevo release
- Producción tal vez deberia tener protección 


## ¿Cómo se vincula el workflow a ciertos eventos?
Mediante el field "On" es posible vincular a ciertos eventos, estos eventos pueden ser push, pull requests o nuevos tags.
 ```yaml

        on:
            workflow_dispatch:
            push:
                branches: [main, dev]
            paths:
                - 'back/**'
            tags:
            - 'v*'
 ```
 
 - Tomar en cuenta que si vinculas el On con tags, se disparará en la creación de cualquier tag (si disparas el tag desde dev, se creará en base a dev)
 - Paths es importante, ya que de eso dependerá de si se activa el workflow para front o back, el workflow de front irá vinculado a front y así de igual manera con back.
 - **workflow_dispatch** nos permite accionar el workflow desde la interfaz de github, esto es util en caso de que llegue a fallar un deploy.

## ¿Cómo reutilizar Workflows?
Para poder llamar workFlows desde otro workflow se debe usar on: workflow_call
 ```yaml
on:
  workflow_call:
 ```
 
 Para reusar un workflow desde otro workflow debe cumplirse alguna de estas condiciones:
 - Ambos workflow deben estar en el mismo repositorio
 - El workflow a reusar está en un repositorio público
 
 También hay que tomar en cuenta lo siguiente:
 - Los workflows reusables no pueden llamar a otros workflows reusables.
 - Los workflows en repositorios privados solo pueden usar otros workflows en el mismo repositorio (como se nombró anteriormente)
 - Cualquier variable ENV no son enviadas al workflow reusable, para esto se utilizará otro método que veremos más adelante.

Podemos declarar que el workflow recibirá ciertos argumentos de la siguiente manera, prestar atención a como en Jobs se utiliza el **${{inputs.username}}** y **${{secrets.token}}**:
 ```yaml
on:
  workflow_call:
      inputs:
      username:
        required: true
        type: string
    secrets:
      token:
        required: true
        
jobs:
  example_job:
    name: Pass input and secrets to my-action
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/my-action@v1
        with:
          username: ${{ inputs.username }}
          token: ${{ secrets.token }}
 ```

Y para enviarle los argumentos, al momento de reutilizar el workflow se hace de la siguiente forma:

 ```yaml
jobs:
  call-workflow-passing-data:
    uses: octo-org/example-repo/.github/workflows/reusable-workflow.yml@main
    with:
      username: mona
    secrets:
      token: ${{ secrets.token }}
 
 ```
 
 Especial atención a que invocamos el workflow reusable con la dirección del repositorio y el username de la cuenta de github antes.


## ¿Cómo hacer jobs condicionales?

Se puede emplear el uso de "if" para definir cuáles jobs van a ser ejecutados y cuáles no. Esto serviría por ejemplo, para definir 3 jobs y que según la rama que accione ese workflow, se ejecute el deploy a production, dev o staging.

 ```yaml
jobs:
  Build:
    uses: ap1402/CID-CD-POC/.github/workflows/backend-build.yml@dev

  DeployDev:
    name: Deploy to Dev
    if: github.event.ref == 'refs/heads/dev'
    needs: [Build]
    runs-on: ubuntu-latest
    environment:
      name: dev
      url: 'http://staging.url.com'
    steps:
      - name: Download Artifac
        uses: actions/download-artifact@v2
        with:
          name: function
 
 ```
 Podemos observar que tenemos un job llamado "build", encargado de crear el build de nuestro proyecto. Y un Job llamado "deploydev" que se ejecutará solo si el workflow es llamado desde la branch "dev" 
 
```yaml
      if: github.event.ref == 'refs/heads/dev'
      # Deploy en production
      if: github.event.ref == 'refs/heads/main'
      # Deploy en staging
      if: github.event.ref == 'refs/heads/staging'
```  
## Con respecto a compartir archivos entre Jobs
Se pueden compartir archivos fácilmente entre steps dentro de un job, pero al momento de compartir archivos entre jobs **dentro del mismo workflow**, se requiere hacer un paso adicional. No se pueden compartir archivos entre workflows.\

Veamos el siguiente ejemplo:

```yaml
name: Build Frontend
on:
  workflow_call:

jobs:
  build:
    defaults:
      run:
        working-directory: front
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source code
        uses: actions/checkout@master

      - name: Cache node modules
        uses: actions/cache@v1
        with:
          path: node_modules
          key: ${{ runner.OS }}-build-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.OS }}-build-
            ${{ runner.OS }}-
      - name: Install
        run: npm install

      - name: Build
        run: npm run build

      - name: Upload build to artifac
        uses: actions/upload-artifact@v2
        with:
          name: front
          path: front/dist


```

Se puede observar que como último paso se empleó el siguiente step: 

```yaml
      - name: Upload build to artifac
        uses: actions/upload-artifact@v2
        with:
          name: front
          path: front/dist
```
**Path es la carpeta que deseamos compartir***, este nos permite intercambiar archivos entre jobs dentro de un workflows. Emplearemos primero upload-artifact para subir el artifact.\
Luego emplearemos el uso de download-artifact para usar el archivo en otro job.

```yaml
 - name: Download Artifac
        uses: actions/download-artifact@v2
        with:
          name: front
          path: dist
```
**Path** en este caso es la carpeta en la que se va a descargar el archivo.

## Flujo de deploy para CI/CD:
   - push a dev -> deploy a dev env
   - push a staging -> deploy a staging env
   - push a main -> deploy a production env

## TODO:

- Agregar tests de codigo en pull request con sonarquobe (parece que necesita una licencia para ser integrado con github actions), por los momentos lo agregué con sonarcloud que tiene una licencia abierta.

## Ejemplos:

#### Front build reusable
```yaml
name: Build Frontend
on:
 # Declaramos que este workflow puede ser accionado desde otro workflow
  workflow_call:

jobs:
  build:
    defaults:
      run:
        working-directory: front
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source code
        uses: actions/checkout@master

      - name: Cache node modules
        uses: actions/cache@v1
        with:
          path: node_modules
          key: ${{ runner.OS }}-build-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.OS }}-build-
            ${{ runner.OS }}-
      - name: Install
        run: npm install

      - name: Build
        run: npm run build
    # Subimos la carpeta ubicada en front/dist como artifact con el nombre de front para que el workflow que llegue a llamar a build pueda descargarlo
      - name: Upload build to artifac
        uses: actions/upload-artifact@v2
        with:
          name: front
          path: front/dist
```

#### Front deployment
```yaml
name: Deploy Front
on: 
# Declaramos que este workflow puede ser accionado  desde la interfaz de github
  workflow_dispatch:
  push:
  # Declaramos que este workflow puede ser accionado con algun push que haga un cambio en la carpeta "front" en las branches main, staging y dev
    branches: [main, staging, dev]
    paths:
      - 'front/**'

jobs:
  Build:
    uses: ap1402/CID-CD-POC/.github/workflows/frontend-build.yml@dev

  DeployDev:
    name: Deploy to Dev
    # Solo se ejecturá si la branch que lo acciona es dev
    if: github.event.ref == 'refs/heads/dev'
    runs-on: ubuntu-latest
    # Declaramos que este job es dependiente de Build y que debe esperar a que esté completado
    needs: [Build]
    steps:
    # Descargamos el artifact llamado front y lo guardamos en una carpeta llamada dist
      - name: Download Artifac
        uses: actions/download-artifact@v2
        with:
          name: front
          path: dist
      - name: Deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 cp \
            --recursive \
            --region us-east-2 \
            dist/front-poc s3://angular-bucket-poc

  DeployStaging:
    name: Deploy to Staging
    if: github.event.ref == 'refs/heads/dev'
    runs-on: ubuntu-latest
    needs: [Build]
    steps:
      - name: Download Artifac
        uses: actions/download-artifact@v2
        with:
          name: front
          path: dist
      - name: Deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 cp \
            --recursive \
            --region us-east-2 \
            dist/front-poc s3://angular-bucket-poc


  DeployProd:
    name: Deploy to Prod
    if: github.event.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: [Build]
    steps:
      - name: Download Artifac
        uses: actions/download-artifact@v2
        with:
          name: front
          path: dist
      - name: Deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 cp \
            --recursive \
            --region us-east-2 \
            dist/front-poc s3://angular-bucket-poc       

```


### Workflow reusable para deployar lambda
Asignamos nombre de funcion, zipname y los secretos necesarios para desplegar la lambda
```yaml
name: Reusable backend deploy policy

on:
  workflow_call:
    inputs:
      functionName:
        required: true
        type: string
      functionZipName:
        required: true
        type: string
    secrets:
      aws_access_key_id:
        required: true
      aws_secret_access_key:
        required: true
      aws_region:
        required: true
jobs:
  DeployDev:
    name: Deploy to Dev
    if: github.event.ref == 'refs/heads/dev'
    runs-on: ubuntu-latest
    environment:
      name: dev
      url: 'http://staging.url.com'
    steps:
      - name: Download Artifac
        uses: actions/download-artifact@v2
        with:
          name: function
      - name: Deploy to AWS
        uses: appleboy/lambda-action@master
        with:
          aws_access_key_id: ${{secrets.aws_access_key_id}}
          aws_secret_access_key: ${{secrets.aws_secret_access_key}}
          aws_region: ${{secrets.aws_region}}
          function_name: ${{inputs.functionName}}
          zip_file: ${{inputs.functionZipName}}

  DeployStaging:
    name: Deploy to Staging
    if: github.event.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: 'http://staging.url.com'
    steps:
      - name: Download Artifac
        uses: actions/download-artifact@v2
        with:
          name: function
      - name: Deploy to AWS
        uses: appleboy/lambda-action@master
        with:
          aws_access_key_id: ${{secrets.aws_access_key_id}}
          aws_secret_access_key: ${{secrets.aws_secret_access_key}}
          aws_region: ${{secrets.aws_region}}
          function_name: ${{inputs.functionName}}
          zip_file: ${{inputs.functionZipName}}

  DeployProd:
    name: Deploy to Production
    if: github.event.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: prod
      url: 'http://prod.url.com'
    steps:
      - name: Deploy to AWS
        uses: appleboy/lambda-action@master
        with:
          aws_access_key_id: ${{secrets.aws_access_key_id}}
          aws_secret_access_key: ${{secrets.aws_secret_access_key}}
          aws_region: ${{secrets.aws_region}}
          function_name: ${{inputs.functionName}}
          zip_file: ${{inputs.functionZipName}}
```
Para luego llamar al workflow de la siguiente manera:
```yaml
name: Deploy backend reusable deploy test

on:
  workflow_dispatch:
  push:
    branches: [main, dev, staging]
    paths:
      - 'back/**'
    tags:
      - 'v*'

jobs:
  Loggin:
    runs-on: ubuntu-latest
    steps:
      - run: echo "🎉 The job was automatically triggered by a ${{ github.event_name }} event."
  Build:
    uses: ap1402/CID-CD-POC/.github/workflows/backend-build.yml@dev

  Deploy:
    uses: ap1402/CID-CD-POC/.github/workflows/Reusable-deploy-lambda.yml@dev
    needs: [Build]
    with:
      functionName: function-test
      functionZipName: function.zip
    secrets:
      aws_access_key_id: ${{secrets.AWS_ACCESS_KEY_ID}}
      aws_secret_access_key: ${{secrets.AWS_SECRET_ACCESS_KEY}}
      aws_region: ${{secrets.AWS_REGION}}
```
