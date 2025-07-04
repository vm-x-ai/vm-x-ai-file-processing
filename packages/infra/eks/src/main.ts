#!/usr/bin/env node
import { getStages } from '@vmxfp/infra-cdk-shared';
import * as cdk from 'aws-cdk-lib';
import { EKSStack } from './stacks/eks-stack.js';

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  if (!stage.adminRoleArn) {
    continue;
  }

  const baseParams = {
    stage: stage.stageName,
    env: {
      account: stage.accountId,
      region: stage.region,
    },
  };

  new EKSStack(app, `vmxfp-eks-cluster-${stage.stageName}`, {
    ...baseParams,
    adminRoleArn: stage.adminRoleArn,
    ecrAccountId: getStages('shared')[0].accountId,
    ecrRepositoryPrefix: `vmxfp-`,
  });
}
