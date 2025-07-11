#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getStages, RESOURCE_PREFIX, resolveArgoCDPath } from '@workspace/infra-cdk-shared';
import { APIStack } from './stacks/api-stack.js';

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  const baseParams = {
    stage: stage.stageName,
    env: {
      account: stage.accountId,
      region: stage.region,
    },
  };

  new APIStack(app, `${RESOURCE_PREFIX}-api-${stage.stageName}`, {
    ...baseParams,
    gitOps: {
      ...stage.gitOps,
      path: resolveArgoCDPath(import.meta.url),
    },
  });
}
