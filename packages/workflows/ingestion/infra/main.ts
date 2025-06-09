#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getStages } from '@dm/infra-cdk-shared';
import { IngestionWorkflowStack } from './stacks/storage-stack.js';

const stageMap: Record<string, { ingestionUrls: string[] }> = {
  local: {
    ingestionUrls: [
      // Linux or Windows WSL
      'http://172.17.0.1:8000/workflow/ingestion/trigger',
      // Mac
      'http://host.docker.internal:8000/workflow/ingestion/trigger',
    ],
  },
  dev: {
    ingestionUrls: [
      // Lucas's local ngrok
      'https://chamois-accepted-bluebird.ngrok-free.app/workflow/ingestion/trigger',
    ],
  },
};

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  new IngestionWorkflowStack(app, `ingestion-workflow-${stage.stageName}`, {
    ...stageMap[stage.stageName],
    stage: stage.stageName,
    env: {
      account: stage.accountId,
      region: stage.region,
    },
  });
}
