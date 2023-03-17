# Trigger GitLab pipeline action

This action triggers a pipeline for a specified project and ref at a specified GitLab instance.

## Inputs

### `ci-api-v4-url`

**Required** The root URL of the GitLab instance v4 API.

### `project-id`

**Required** The ID of the project for which a pipeline shall be started.

### `ref`

**Required** The ref of the project for which a pipeline shall be started.

### `token`

**Required** A trigger token for the GitLab project.

## Outputs

None.

## Example usage

```yaml
uses: NordSecurity/trigger-gitlab-pipeline@v1
with:
  ci-api-v4-url: 'https://gitlab.com/api/v4'
  project-id: '1'
  ref: 'main'
  token: 'glptt-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```
