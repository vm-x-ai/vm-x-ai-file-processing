#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getStages, RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';
import { GitHubActionsAuthStack } from './stacks/github-actions-auth-stack.js';

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  new GitHubActionsAuthStack(
    app,
    `${RESOURCE_PREFIX}-github-actions-auth-${stage.stageName}`,
    {
      stage: stage.stageName,
      repositoryConfig: [
        {
          owner: stage.gitOps.owner,
          repo: stage.gitOps.repo,
        },
      ],
      env: {
        account: stage.accountId,
        region: stage.region,
      },
    }
  );
}
