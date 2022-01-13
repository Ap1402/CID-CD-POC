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
#### NOTES:
- Current stage workflow: 
    - push to dev -> deployed to dev env
    - push to main -> deployed first to staging and waits for prod approval
    - approval prod -> deploys to prod

  ![image](https://user-images.githubusercontent.com/37101632/149381077-882be50c-c75d-42c3-b0e5-0f48df2d4379.png)

 
#### TODO:

- Add tests with sonarqube on all actions (it seems that I need a license if I need to integrate it with github actions)
- Do more research to find if there is a way to loop throught lambda folders for deploying
