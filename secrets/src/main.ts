#!/usr/bin/env node
import { getStages } from '@workspace/infra-cdk-shared';
import * as cdk from 'aws-cdk-lib';
import { SecretsKmsStack } from './stacks/secrets-kms-stack.js';

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  const baseParams = {
    stage: stage.stageName,
    env: {
      account: stage.accountId,
      region: stage.region,
    },
  };

  new SecretsKmsStack(app, `secrets-kms-${stage.stageName}`, {
    ...baseParams,
  });
}
