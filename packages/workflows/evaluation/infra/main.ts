#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {
  getStages,
  resolveArgoCDPath,
  RESOURCE_PREFIX,
} from '@workspace/infra-cdk-shared';
import { EvaluationWorkflowStack } from './stacks/workflow-stack.js';

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  new EvaluationWorkflowStack(
    app,
    `${RESOURCE_PREFIX}-evaluation-workflow-${stage.stageName}`,
    {
      stage: stage.stageName,
      sharedServicesAccountId: getStages('shared')[0].accountId,
      gitOps: {
        ...stage.gitOps,
        path: resolveArgoCDPath(import.meta.url),
      },
      env: {
        account: stage.accountId,
        region: stage.region,
      },
    }
  );
}
