# CID/CD POC

This is a simple POC for a monorepo CI/CD using github actions


#### Considerations:

- Versioning will be made with “v1.xx.xx” or "v1.xx.xx-backend/frontend", etc. 
- On needs to be hooked to version tags for new releases
- Front and back should have different workflows
- Back should deploy to lambda functions
- Front should deploy to S3 and clean the previous folder before uploading the new release
- How do I know if a lambda was updated?
- Every lambda should have its own job? Every lambda should update with a different function name
- How different environments will work?
- Production workflow should have protection


### File structure:
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
 
 **On** defines when this workflow will trigger. We use Push binded to "main" and "dev" branches to trigger this workflow when something is pushed to this branches. Taking into account that we only want to deploy backend, we add another field called "paths" which will define **if anything was pushed to that folder.**
 
 ```yaml
    Build:
    defaults:
      run:
        working-directory: back
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v2
      - name: Cache node modules
        uses: actions/cache@v1
        with:
          path: node_modules
          key: ${{ runner.OS }}-build-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.OS }}-build-
            ${{ runner.OS }}-
      - name: Install Dependencies
        run: yarn

      - name: Build
        run: yarn build

      - name: Move node_modules to dist
        run: mv node_modules dist/node_modules

      - name: Zip
        run: (cd dist && zip -r ../function.zip .)
      - name: Upload build to artifac
        uses: actions/upload-artifact@v2
        with:
          name: function
          path: back/function.zip
 ```
          
 Build it's a job that we can reuse in order to create the build that we need to deploy on any stage. It is important to mention that the step called "name: Upload build to artifact" it's essential for sharing this file with other jobs, we need to upload an artifact and download it on another job.
**Github does not share any files between jobs, that's why we need to use artifact or cache**

#### NOTES:
- Current stage workflow: 
    - push to dev -> deployed to dev env
    - push to main -> deployed first to staging and waits for prod approval
    - approval prod -> deploys to prod

  ![image](https://user-images.githubusercontent.com/37101632/149381077-882be50c-c75d-42c3-b0e5-0f48df2d4379.png)

 
#### TODO:

- Add tests with sonarqube on all actions (it seems that I need a license if I need to integrate it with github actions)
- Do more research to find if there is a way to loop throught lambda folders for deploying
