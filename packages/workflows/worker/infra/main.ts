#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getStages, RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';
import { TemporalWorkerStack } from './stacks/worker-stack.js';

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  const baseParams = {
    stage: stage.stageName,
    env: {
      account: stage.accountId,
      region: stage.region,
    },
  };

  new TemporalWorkerStack(
    app,
    `${RESOURCE_PREFIX}-app-temporal-worker-${stage.stageName}`,
    {
      ...baseParams,
    }
  );
}
