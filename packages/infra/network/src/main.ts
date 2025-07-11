#!/usr/bin/env node
import { getStages, RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from './stacks/network-stack.js';

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  const baseParams = {
    stage: stage.stageName,
    env: {
      account: stage.accountId,
      region: stage.region,
    },
  };

  new NetworkStack(app, `${RESOURCE_PREFIX}-network-${stage.stageName}`, {
    ...baseParams,
    cidr: stage.cidr,
  });
}
