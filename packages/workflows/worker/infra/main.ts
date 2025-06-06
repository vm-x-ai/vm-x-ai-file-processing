#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getStages } from '@dm/infra-cdk-shared';
import { IngestionWorkflowStorageStack } from './stacks/storage-stack.js';

const stageMap: Record<string, { ingestionUrls: string[] }> = {
  local: {
    ingestionUrls: [
      'http://172.17.0.1:8000/ingest',
    ],
  },
  dev: {
    ingestionUrls: [
      // Lucas's local ngrok
      'https://chamois-accepted-bluebird.ngrok-free.app/ingest',
    ],
  },
};

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  new IngestionWorkflowStorageStack(
    app,
    `ingestion-workflow-storage-${stage.stageName}`,
    {
      ...stageMap[stage.stageName],
      stage: stage.stageName,
      env: {
        account: stage.accountId,
        region: stage.region,
      },
    }
  );
}
