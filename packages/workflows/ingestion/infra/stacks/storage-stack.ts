import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
export interface IngestionWorkflowStorageStackProps extends cdk.StackProps {
  stage: string;
  ingestionUrls: string[];
}

export class IngestionWorkflowStorageStack extends cdk.Stack {
  public readonly landingBucket: s3.Bucket;
  public readonly thumbnailBucket: s3.Bucket;
  public readonly workflowTriggerTopic: sns.Topic;

  constructor(
    scope: Construct,
    id: string,
    props: IngestionWorkflowStorageStackProps
  ) {
    super(scope, id, props);

    this.workflowTriggerTopic = new sns.Topic(
      this,
      'IngestionWorkflowTriggerTopic',
      {
        topicName: `diligencemachines-ingestion-trigger-${this.region}-${props.stage}`,
      }
    );

    const cors = [
      {
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.PUT,
          s3.HttpMethods.POST,
          s3.HttpMethods.DELETE,
        ],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag'],
        maxAge: 3000,
      },
    ];

    this.landingBucket = new s3.Bucket(this, 'IngestionWorkflowStorageBucket', {
      bucketName: `diligencemachines-ingestion-landing-${this.region}-${props.stage}`,
      cors,
      versioned: true,
    });

    this.landingBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SnsDestination(this.workflowTriggerTopic)
    );

    this.thumbnailBucket = new s3.Bucket(
      this,
      'IngestionWorkflowStorageThumbnailBucket',
      {
        bucketName: `diligencemachines-file-thumbnail-${this.region}-${props.stage}`,
        cors,
        versioned: true,
      }
    );

    for (const ingestionUrl of props.ingestionUrls) {
      new sns.Subscription(this, `IngestionWorkflowTriggerSubscription-${ingestionUrl}`, {
        endpoint: ingestionUrl,
        protocol: sns.SubscriptionProtocol.HTTPS,
        topic: this.workflowTriggerTopic,
      });
    }
  }
}
