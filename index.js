'use strict';

const core = require('@actions/core');
const github = require('@actions/github');
const http = require('@actions/http-client');

class GitlabClient {
    constructor (inputConfig, githubConfig) {
        this.inputConfig = inputConfig;
        this.githubConfig = githubConfig;
        this.client = new http.HttpClient();
    }

    async request (method, url, data) {
        let res;

        url.searchParams.append('access_token', this.inputConfig.accesToken);

        if (method === 'GET') {
            res = await this.client.get(url);
        } else if (method === 'POST') {
            const additionalHeaders = {
                'Content-Type': 'application/json'
            };
            res = await this.client.post(url, data, additionalHeaders);
        } else {
            throw new Error(`Unsupported method: ${method}`);
        }

        if (res.message.statusCode !== 200 && res.message.statusCode !== 201) {
            throw new Error(`API request [${method}] ${url.pathname} failed with code ${res.message.statusCode}`);
        }

        const body = await res.readBody();
        return JSON.parse(body);
    }

    async get (url) {
        return await this.request('GET', url);
    }

    async post (url, data) {
        return await this.request('POST', url, data);
    }

    async fetchRunningPipelinesIds () {
        const fourHoursBefore = new Date();
        fourHoursBefore.setHours(fourHoursBefore.getHours() - 4);

        const url = new URL(`projects/${this.inputConfig.projectId}/pipelines`, this.inputConfig.apiUrl);
        url.searchParams.append('ref', this.inputConfig.triggeredRef);
        url.searchParams.append('status', 'running');
        url.searchParams.append('per_page', '100');
        url.searchParams.append('updated_after', fourHoursBefore.toISOString());

        const pipelines = await this.get(url);
        return pipelines.map(pipeline => pipeline.id);
    }

    async filterPipelinesByGithubRef (pipelineIds) {
        const requests = pipelineIds.map(pipelineId => {
            const url = new URL(
                `projects/${this.inputConfig.projectId}/pipelines/${pipelineId}/variables`,
                this.inputConfig.apiUrl
            );
            return this.get(url);
        });
        const variables = await Promise.all(requests);

        return pipelineIds.filter((_, index) => {
            const githubRefName = variables[index].find(variable => variable.key === 'GITHUB_REF_NAME');
            const githubRefType = variables[index].find(variable => variable.key === 'GITHUB_REF_TYPE');
            return githubRefName && githubRefType &&
                githubRefName.value === this.githubConfig.githubRefName &&
                githubRefType.value === this.githubConfig.githubRefType;
        });
    }

    async cancelPreviousPipelines (pipelineIds) {
        const requests = pipelineIds.map(pipelineId => {
            const url = new URL(
                `projects/${this.inputConfig.projectId}/pipelines/${pipelineId}/cancel`,
                this.inputConfig.apiUrl
            );
            return this.post(url);
        });
        await Promise.all(requests);
    }

    async triggerPipeline () {
        const url = new URL(`projects/${this.inputConfig.projectId}/trigger/pipeline`, this.inputConfig.apiUrl);

        url.searchParams.append('token', this.inputConfig.triggerToken);
        url.searchParams.append('ref', this.inputConfig.triggeredRef);
        url.searchParams.append('variables[GITHUB_REF_NAME]', this.githubConfig.githubRefName);
        url.searchParams.append('variables[GITHUB_REF_TYPE]', this.githubConfig.githubRefType);
        url.searchParams.append('variables[GITHUB_REPO]', this.githubConfig.githubRepo);
        url.searchParams.append('variables[GITHUB_SHA]', this.githubConfig.githubSha);
        url.searchParams.append('variables[GITHUB_SCHEDULE]', this.inputConfig.schedule);

        return await this.post(url);
    }
}

async function execute (inputConfig, githubConfig) {
    const gitlabClient = new GitlabClient(inputConfig, githubConfig);

    if (inputConfig.cancelOutdatedPipelines) {
        const pipelineIds = await gitlabClient.fetchRunningPipelinesIds();
        const filteredPipelineIds = await gitlabClient.filterPipelinesByGithubRef(pipelineIds);
        await gitlabClient.cancelPreviousPipelines(filteredPipelineIds);
    }

    const resp = await gitlabClient.triggerPipeline();
    return resp.id;
}

function getEnv (name) {
    const val = process.env[name] || '';
    if (!val) {
        throw new Error(`Environment variable expected, but not supplied: ${name}`);
    }
    return val;
}

function getBooleanEnv (name) {
    const trueValue = ['true', 'True', 'TRUE'];
    const falseValue = ['false', 'False', 'FALSE'];
    const val = getEnv(name);
    if (trueValue.includes(val)) return true;
    if (falseValue.includes(val)) return false;
    throw new TypeError(`Input could not be converted to boolean value: ${name}`);
}

async function main () {
    const inputConfig = {
        apiUrl: getEnv('CI_API_V4_URL'),
        accesToken: getEnv('ACCESS_TOKEN'),
        triggerToken: getEnv('TRIGGER_TOKEN'),
        projectId: getEnv('PROJECT_ID'),
        triggeredRef: getEnv('TRIGGERED_REF'),
        schedule: getBooleanEnv('SCHEDULE'),
        cancelOutdatedPipelines: getBooleanEnv('CANCEL_OUTDATED_PIPELINES')
    };

    const githubConfig = {
        githubRefName: process.env.GITHUB_REF_NAME,
        githubRefType: process.env.GITHUB_REF_TYPE,
        githubRepo: github.context.repo.repo,
        githubSha: github.context.sha
    };

    switch (github.context.eventName) {
    case 'pull_request':
    case 'pull_request_target':
        githubConfig.githubSha = github.context.payload.pull_request.head.sha;
        break;
    case 'push':
    case 'schedule':
    case 'merge_group':
        break;
    default:
        throw new Error(`Unsupported triggering event: ${github.context.eventName}`);
    }

    Object.freeze(inputConfig);
    Object.freeze(githubConfig);

    core.notice(await execute(inputConfig, githubConfig));
}

if (github.context.sha) {
    main().catch(e => {
        console.log(e);
        core.setFailed(e.toString());
    });
} else {
    // This is executed when running locally and can be used for testing
    const inputConfig = {
        apiUrl: '',
        accesToken: '',
        triggerToken: '',
        projectId: '',
        triggeredRef: '',
        schedule: false,
        cancelOutdatedPipelines: true
    };

    const githubConfig = {
        githubRefName: '',
        githubRefType: '',
        githubRepo: '',
        githubSha: ''
    };

    Object.freeze(inputConfig);
    Object.freeze(githubConfig);

    execute(inputConfig, githubConfig).then(
        res => {
            console.log(res);
        }
    ).catch(e => {
        console.log(e);
    });
}
