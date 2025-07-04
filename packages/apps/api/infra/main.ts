#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getStages } from '@vmxfp/infra-cdk-shared';
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

  new APIStack(app, `vmxfp-app-api-${stage.stageName}`, {
    ...baseParams,
  });
}
