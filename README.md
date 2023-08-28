# Trigger GitLab pipeline action

This action triggers a pipeline for a specified project and ref at a specified GitLab instance.

## Inputs

### `ci-api-v4-url`

**Required** The root URL of the GitLab instance v4 API.

### `access-token`

**Required** A project access token (PAT) with Maintainer API access for the GitLab project.

Instructions on creating access tokens: https://docs.gitlab.com/ee/user/project/settings/project_access_tokens.html#create-a-project-access-token

### `trigger-token`

**Required** A pipeline trigger token (PTT) for the GitLab project.

Instructions on creating trigger tokens: https://docs.gitlab.com/ee/ci/triggers/#create-a-trigger-token

### `project-id`

**Required** The ID of the project for which a pipeline shall be started.

### `triggered-ref`

**Required** The ref of the project for which a pipeline shall be started.

### `schedule`

**Optional** **[Default: false]** An indication if it is an automatically scheduled request.

### `cancel-outdated-pipelines`

**Optional** **[Default: true]** If set to true, it will cancel previous pipelines that are running for the same reference.

## Outputs

None.

## Example usage

```yaml
uses: NordSecurity/trigger-gitlab-pipeline@v2
with:
  ci-api-v4-url: 'https://gitlab.com/api/v4/'
  access-token: 'glpat-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  trigger-token: 'glptt-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  project-id: '1'
  triggered-ref: 'main'
```

# Developement
## Linters
This project uses ESLint to lint the code. To run it locally install dev dependencies once with:
```
$npm install
```
and run eslint with:
```
$npx eslint ./index.js
```
## Updating node_modules
Because this repository is a nodejs github action it should have node_modules that are needed to run the action committed into the repository.
To not bloat the repository unnecessarily please only commit production dependencies.
In order to install only production dependencies please run this before committing node_modules:
```
$npm install --omit=dev
```
