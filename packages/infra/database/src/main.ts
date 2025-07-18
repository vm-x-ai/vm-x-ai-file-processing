#!/usr/bin/env node
import { getStages, RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { DatabaseStack } from './stacks/database-stack.js';

const configMap: Record<string, { instanceType: ec2.InstanceType }> = {
  dev: {
    instanceType: ec2.InstanceType.of(
      ec2.InstanceClass.T4G,
      ec2.InstanceSize.MEDIUM
    ),
  },
  prod: {
    instanceType: ec2.InstanceType.of(
      ec2.InstanceClass.T4G,
      ec2.InstanceSize.MEDIUM
    ),
  },
};

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  const baseParams = {
    stage: stage.stageName,
    env: {
      account: stage.accountId,
      region: stage.region,
    },
  };

  new DatabaseStack(app, `${RESOURCE_PREFIX}-database-${stage.stageName}`, {
    ...baseParams,
    instanceType: configMap[stage.stageName].instanceType,
  });
}
