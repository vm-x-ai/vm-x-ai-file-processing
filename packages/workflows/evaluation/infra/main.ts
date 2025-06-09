#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getStages } from '@dm/infra-cdk-shared';
import { EvaluationWorkflowStack } from './stacks/trigger-stack.js';

const stageMap: Record<string, { triggerUrls: string[] }> = {
  local: {
    triggerUrls: [
      // Linux or Windows WSL
      'http://172.17.0.1:8000/workflow/evaluation/trigger',
      // Mac
      'http://host.docker.internal:8000/workflow/evaluation/trigger',
    ],
  },
  dev: {
    triggerUrls: [
      // Lucas's local ngrok
      'https://chamois-accepted-bluebird.ngrok-free.app/workflow/evaluation/trigger',
    ],
  },
};

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  new EvaluationWorkflowStack(app, `evaluation-workflow-${stage.stageName}`, {
    ...stageMap[stage.stageName],
    stage: stage.stageName,
    env: {
      account: stage.accountId,
      region: stage.region,
    },
  });
}
