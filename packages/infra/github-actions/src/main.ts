#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getStages } from '@vmxfp/infra-cdk-shared';
import { GitHubActionsAuthStack } from './stacks/github-actions-auth-stack.js';

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  new GitHubActionsAuthStack(
    app,
    `vmxfp-github-actions-auth-${stage.stageName}`,
    {
      stage: stage.stageName,
      repositoryConfig: [
        {
          owner: 'vm-x-ai',
          repo: 'vmxfp',
        },
      ],
      env: {
        account: stage.accountId,
        region: stage.region,
      },
    }
  );
}
