#!/usr/bin/env node
import { getStages } from '@vmxfp/infra-cdk-shared';
import * as cdk from 'aws-cdk-lib';
import { ECRStack } from './stacks/ecr-stack.js';
import { ECRKeyStack } from './stacks/ecr-key-stack.js';

const app = new cdk.App();
const stage = getStages('shared')[0];
const baseParams = {
  stage: stage.stageName,
  env: {
    account: stage.accountId,
    region: stage.region,
  },
};

const ecrKeyStack = new ECRKeyStack(app, `vmxfp-ecr-key-${stage.stageName}`, {
  ...baseParams,
  accountIds: getStages()
    .filter((stage) => stage.stageName !== 'local')
    .map((stage) => stage.accountId),
});

const repositories = [
  'api',
  'temporal-worker',
  'ui',
  'ingestion-workflow-sqs-consumer',
  'evaluation-workflow-sqs-consumer',
];

for (const repository of repositories) {
  new ECRStack(app, `vmxfp-ecr-${repository}-${stage.stageName}`, {
    ...baseParams,
    accountIds: getStages()
      .filter((stage) => stage.stageName !== 'local')
      .map((stage) => stage.accountId),
    repositoryName: repository,
    encryptionKey: ecrKeyStack.encryptionKey,
  });
}
