import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface IngestionWorkflowStackProps extends cdk.StackProps {
  stage: string;
  ingestionUrls: string[];
}

export class IngestionWorkflowStack extends cdk.Stack {
  public readonly landingBucket: s3.Bucket;
  public readonly thumbnailBucket: s3.Bucket;
  public readonly workflowTriggerTopic: sns.Topic;

  constructor(
    scope: Construct,
    id: string,
    props: IngestionWorkflowStackProps
  ) {
    super(scope, id, props);

    this.workflowTriggerTopic = new sns.Topic(
      this,
      'IngestionWorkflowTriggerTopic',
      {
        topicName: `vm-x-ai-ingestion-trigger-${this.region}-${props.stage}`,
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
      bucketName: `vm-x-ai-ingestion-landing-${this.region}-${props.stage}`,
      cors,
      versioned: true,
    });

    /**
     * By default, AWS CDK does the notification configuration by
     * creating a CloudFormation Custom Resource.
     *
     * This is not supported in LocalStack, so we need to manually.
     *
     * Please use the bucket.addEventNotification method if you don't
     * want to deploy to LocalStack.
     */
    (
      this.landingBucket.node.findChild('Resource') as s3.CfnBucket
    ).notificationConfiguration = {
      topicConfigurations: [
        {
          event: 's3:ObjectCreated:Put',
          topic: this.workflowTriggerTopic.topicArn,
        },
      ],
    };

    this.workflowTriggerTopic.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['sns:Publish'],
        principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
        resources: [this.workflowTriggerTopic.topicArn],
        conditions: {
          ArnLike: {
            'aws:SourceArn': this.landingBucket.bucketArn,
          },
        },
      })
    );

    this.thumbnailBucket = new s3.Bucket(
      this,
      'IngestionWorkflowStorageThumbnailBucket',
      {
        bucketName: `vm-x-ai-file-thumbnail-${this.region}-${props.stage}`,
        cors,
        versioned: true,
      }
    );

    for (const ingestionUrl of props.ingestionUrls) {
      new sns.Subscription(
        this,
        `IngestionWorkflowTriggerSubscription-${ingestionUrl}`,
        {
          endpoint: ingestionUrl,
          protocol: ingestionUrl.startsWith('https://')
            ? sns.SubscriptionProtocol.HTTPS
            : sns.SubscriptionProtocol.HTTP,
          topic: this.workflowTriggerTopic,
        }
      );
    }
  }
}
