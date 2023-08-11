const core = require('@actions/core');
const github = require('@actions/github');
const http = require('@actions/http-client');

async function main() {
    let sha = github.context.sha;

    switch (github.context.eventName) {
        case "pull_request":
        case "pull_request_target":
            sha = github.context.payload.pull_request.head.sha;
        case "push":
            break;
        case "schedule":
            break;

        default:
            core.debug('Not a push event, bailing out');

            return;
    }

    const repo = github.context.repo;

    const apiUrl = core.getInput('ci-api-v4-url', { required: true });
    const id = core.getInput('project-id', { required: true });
    const ref = core.getInput('ref', { required: true });
    const token = core.getInput('token', { required: true });
    const schedule = core.getBooleanInput('schedule', { required: false });

    const client = new http.HttpClient();
    const url = new URL(`projects/${id}/trigger/pipeline`, apiUrl);

    core.info(`GITHUB_REF_NAME: ${process.env.GITHUB_REF_NAME}`);
    core.info(`GITHUB_REF_TYPE: ${process.env.GITHUB_REF_TYPE}`);

    url.searchParams.append('token', token);
    url.searchParams.append('ref', ref);
    url.searchParams.append('variables[GITHUB_REF_NAME]', process.env.GITHUB_REF_NAME);
    url.searchParams.append('variables[GITHUB_REF_TYPE]', process.env.GITHUB_REF_TYPE);
    url.searchParams.append('variables[GITHUB_REPO]', `${repo.repo}`);
    url.searchParams.append('variables[GITHUB_SHA]', sha);
    url.searchParams.append('variables[GITHUB_SCHEDULE]', schedule);

    let res;
    try {
        res = await client.post(url);
    } catch (e) {
        core.setFailed('HTTP request failed');
        return;
    }

    if (res.message.statusCode != 201) {
        core.setFailed(`API request failed with code ${res.message.statusCode}`);
        return;
    }

    const body = await res.readBody();
    const obj = JSON.parse(body);

    core.notice(obj.id);
}

main();
