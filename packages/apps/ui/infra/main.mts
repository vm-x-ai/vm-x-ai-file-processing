#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getStages, resolveArgoCDPath, RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';
import { UIStack } from './stacks/ui-stack.mjs';

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  const baseParams = {
    stage: stage.stageName,
    env: {
      account: stage.accountId,
      region: stage.region,
    },
  };

  new UIStack(app, `${RESOURCE_PREFIX}-ui-${stage.stageName}`, {
    ...baseParams,
    gitOps: {
      ...stage.gitOps,
      path: resolveArgoCDPath(import.meta.url),
    },
  });
}
