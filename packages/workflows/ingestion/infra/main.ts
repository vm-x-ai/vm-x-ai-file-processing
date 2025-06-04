#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { getStages } from '@dm/infra-cdk-shared';
import { IngestionWorkflowStorageStack } from './stacks/storage-stack.js';

const stageMap: Record<string, { ingestionUrls: string[] }> = {
  dev: {
    ingestionUrls: [
      // Lucas's local ngrok
      'https://e975-2804-1b3-aec1-6963-e95f-f8fe-4e03-36cb.ngrok-free.app/ingest'
    ]
  }
}

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
