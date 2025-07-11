import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import {
  GitOps,
  importEksCluster,
  RESOURCE_PREFIX,
} from '@workspace/infra-cdk-shared';

export interface IngestionWorkflowStackProps extends cdk.StackProps {
  stage: string;
  sharedServicesAccountId: string;
  gitOps: GitOps & {
    path: string;
  };
}

export class IngestionWorkflowStack extends cdk.Stack {
  public readonly landingBucket: s3.Bucket;
  public readonly thumbnailBucket: s3.Bucket;
  private readonly resourcePrefix: string = RESOURCE_PREFIX;

  constructor(
    scope: Construct,
    id: string,
    props: IngestionWorkflowStackProps
  ) {
    super(scope, id, props);

    const workflowTopic = new sns.Topic(this, 'IngestionWorkflowTopic', {
      topicName: `${this.resourcePrefix}-ingestion-ingestion-workflow-${this.region}-${props.stage}`,
    });

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

    const bucketName = `${this.resourcePrefix}-ingestion-landing-${this.region}-${props.stage}`;

    this.landingBucket = new s3.Bucket(this, 'IngestionWorkflowStorageBucket', {
      bucketName,
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
          topic: workflowTopic.topicArn,
        },
      ],
    };

    const workflowTopicPolicy = workflowTopic.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['sns:Publish'],
        principals: [new iam.ServicePrincipal('s3.amazonaws.com')],
        resources: [workflowTopic.topicArn],
        conditions: {
          ArnLike: {
            'aws:SourceArn': `arn:aws:s3:::${bucketName}`,
          },
        },
      })
    );

    if (workflowTopicPolicy.policyDependable) {
      this.landingBucket.node.addDependency(
        workflowTopicPolicy.policyDependable
      );
    }

    this.thumbnailBucket = new s3.Bucket(
      this,
      'IngestionWorkflowStorageThumbnailBucket',
      {
        bucketName: `${this.resourcePrefix}-file-thumbnail-${this.region}-${props.stage}`,
        cors,
        versioned: true,
      }
    );

    const ingestionQueue = new sqs.Queue(this, 'IngestionWorkflowQueue', {
      queueName: `${this.resourcePrefix}-ingestion-workflow-${this.region}-${props.stage}`,
    });

    workflowTopic.addSubscription(
      new snsSubscriptions.SqsSubscription(ingestionQueue)
    );

    new ssm.StringParameter(this, 'IngestionWorkflowQueueUrl', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/ingestion/workflow/queue/url`,
      stringValue: ingestionQueue.queueUrl,
    });

    new ssm.StringParameter(this, 'IngestionWorkflowQueueArn', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/ingestion/workflow/queue/arn`,
      stringValue: ingestionQueue.queueArn,
    });

    if (props.stage !== 'local') {
      const eksCluster = importEksCluster(
        this,
        'EKSCluster',
        props.stage,
        this.resourcePrefix
      );

      eksCluster.addManifest('ArgoCDApp', {
        apiVersion: 'argoproj.io/v1alpha1',
        kind: 'Application',
        metadata: {
          name: `${this.resourcePrefix}-app-ingestion-workflow`,
          namespace: 'argocd',
        },
        spec: {
          destination: {
            namespace: `${this.resourcePrefix}-app`,
            server: 'https://kubernetes.default.svc',
          },
          project: 'default',
          source: {
            path: props.gitOps.path,
            repoURL: props.gitOps.repoUrl,
            targetRevision: props.gitOps.targetRevision,
            helm: {
              valueFiles: [`${props.stage}.values.yaml`],
              values: {
                sharedServicesAccountId: props.sharedServicesAccountId,
                resourcePrefix: this.resourcePrefix,
                stage: props.stage,
                awsRegion: this.region,
                awsAccountId: this.account,
              },
            },
          },
          syncPolicy: {
            automated: {
              prune: true,
              selfHeal: true,
              allowEmpty: true,
            },
          },
        },
      });

      const serviceAccount = eksCluster.addServiceAccount(
        'EksIngestionWorkflowServiceAccount',
        {
          name: `${this.resourcePrefix}-ingestion-workflow-service-account`,
          namespace: `${this.resourcePrefix}-app`,
        }
      );

      ingestionQueue.grantConsumeMessages(serviceAccount.role);
    }
  }
}
