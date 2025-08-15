import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as pipes from '@aws-cdk/aws-pipes-alpha';
import * as pipesSources from '@aws-cdk/aws-pipes-sources-alpha';
import * as pipesTargets from '@aws-cdk/aws-pipes-targets-alpha';
import * as events from 'aws-cdk-lib/aws-events';
import {
  BaseStack,
  BaseStackProps,
  importEksCluster,
} from '@workspace/infra-cdk-shared';

export class IngestionWorkflowStack extends BaseStack {
  public readonly landingBucket: s3.Bucket;
  public readonly thumbnailBucket: s3.Bucket;
  public readonly ingestionQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
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

    const bucketName = `${this.resourcePrefix}-ingestion-landing-${this.account}-${this.region}-${props.stage}`;

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
        bucketName: `${this.resourcePrefix}-file-thumbnail-${this.account}-${this.region}-${props.stage}`,
        cors,
        versioned: true,
      }
    );

    this.ingestionQueue = new sqs.Queue(this, 'IngestionWorkflowQueue', {
      queueName: `${this.resourcePrefix}-ingestion-workflow-${this.region}-${props.stage}`,
    });

    workflowTopic.addSubscription(
      new snsSubscriptions.SqsSubscription(this.ingestionQueue)
    );

    new ssm.StringParameter(this, 'IngestionWorkflowQueueUrl', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/ingestion/workflow/queue/url`,
      stringValue: this.ingestionQueue.queueUrl,
    });

    new ssm.StringParameter(this, 'IngestionWorkflowQueueArn', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/ingestion/workflow/queue/arn`,
      stringValue: this.ingestionQueue.queueArn,
    });

    if (props.stage !== 'local') {
      if (props.stackMode === 'kubernetes') {
        this.addKubernetesResources(props);
      } else {
        this.addServerlessResources(props);
      }
    }
  }

  private addKubernetesResources(props: BaseStackProps) {
    const eksCluster = importEksCluster(
      this,
      'EKSCluster',
      props.stage,
      this.resourcePrefix
    );

    const serviceAccount = eksCluster.addServiceAccount(
      'EksIngestionWorkflowServiceAccount',
      {
        name: `${this.resourcePrefix}-ingestion-workflow-service-account`,
        namespace: `${this.resourcePrefix}-app`,
      }
    );

    this.ingestionQueue.grantConsumeMessages(serviceAccount.role);

    if (props.gitOps.enabled) {
      const argoCDApp = this.registerArgoCDApplication(
        eksCluster,
        props,
        'ingestion-workflow-sqs-consumer',
        `${this.resourcePrefix}-app`
      );
      argoCDApp.node.addDependency(serviceAccount);
    }
  }

  private addServerlessResources(props: BaseStackProps) {
    const functionRole = new iam.Role(this, 'FunctionRole', {
      roleName: `${this.resourcePrefix}-ingestion-workflow-lambda-${this.region}-${props.stage}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    });

    const eventBus = events.EventBus.fromEventBusName(
      this,
      'EventBus',
      `${this.resourcePrefix}-event-bus-${props.stage}`
    );
    eventBus.grantPutEventsTo(functionRole);

    let additionalFunctionProps: Partial<lambda.FunctionProps> = {};

    if (props.stackMode === 'serverless') {
      const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
        vpcName: `${this.resourcePrefix}-app-vpc-${props.stage}`,
      });

      const securityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
        vpc,
        description: 'Security group for the lambda',
        securityGroupName: `${this.resourcePrefix}-app-api-lambda-security-group-${props.stage}`,
      });

      const dbSecurityGroupId = ssm.StringParameter.fromStringParameterName(
        this,
        'DatabaseSecurityGroupId',
        `/${this.resourcePrefix}-app/${props.stage}/database/security-group-id`
      ).stringValue;
      const dbPort = ssm.StringParameter.fromStringParameterName(
        this,
        'DatabasePort',
        `/${this.resourcePrefix}-app/${props.stage}/database/port`
      ).stringValue;

      const dbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this,
        'DatabaseSecurityGroup',
        dbSecurityGroupId
      );

      dbSecurityGroup.addIngressRule(
        securityGroup,
        ec2.Port.tcp(parseInt(dbPort)),
        'Allow access to the database'
      );

      additionalFunctionProps = {
        vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        securityGroups: [securityGroup],
      };
    }

    const dependenciesLayer = new lambda.LayerVersion(
      this,
      'DependenciesLayer',
      {
        code: lambda.Code.fromAsset('.aws-lambda-package/dependencies.zip'),
        compatibleRuntimes: [
          lambda.Runtime.PYTHON_3_11,
          lambda.Runtime.PYTHON_3_12,
          lambda.Runtime.PYTHON_3_13,
        ],
        description: 'Dependencies for the API',
        layerVersionName: `${this.resourcePrefix}-ingestion-workflow-dependencies-${props.stage}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        compatibleArchitectures: [
          lambda.Architecture.X86_64,
          lambda.Architecture.ARM_64,
        ],
      }
    );

    const activityProxy = new lambda.Function(
      this,
      'IngestionWorkflowActivityProxy',
      {
        ...additionalFunctionProps,
        functionName: `${this.resourcePrefix}-ingestion-workflow-activity-proxy-${props.stage}`,
        runtime: lambda.Runtime.PYTHON_3_13,
        code: lambda.Code.fromAsset('.aws-lambda-package/project.zip'),
        handler: 'ingestion_workflow.lambda_functions.activity_proxy.handler',
        description: 'Ingestion Workflow Activity Proxy Lambda Function',
        architecture: lambda.Architecture.ARM_64,
        timeout: cdk.Duration.minutes(15),
        role: functionRole,
        memorySize: 4096,
        environment: {
          ENV: props.stage,
          LOG_LEVEL: 'INFO',
          THUMBNAIL_S3_BUCKET_NAME: this.thumbnailBucket.bucketName,
          DB_SECRET_NAME: `${this.resourcePrefix}-app-database-secret-${props.stage}`,
          OPENAI_SECRET_NAME: 'openai-credentials',
          POPPLER_INSTALLED: 'false',
          EVENT_BUS_NAME: eventBus.eventBusName,
          ...(additionalFunctionProps.environment ?? {}),
        },
        layers: [dependenciesLayer, ...(additionalFunctionProps.layers ?? [])],
      }
    );

    functionRole.attachInlinePolicy(
      new iam.Policy(this, 'SecretsPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: [
              'secretsmanager:BatchGetSecretValue',
              'secretsmanager:GetSecretValue',
              'secretsmanager:DescribeSecret',
            ],
            resources: [
              `arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.resourcePrefix}-app-database-secret-${props.stage}*`,
              `arn:aws:secretsmanager:${this.region}:${this.account}:secret:openai-credentials*`,
              `arn:aws:secretsmanager:${this.region}:${this.account}:secret:vmx-credentials*`,
            ],
          }),
        ],
      })
    );

    functionRole.attachInlinePolicy(
      new iam.Policy(this, 'SSMPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['ssm:GetParameter*'],
            resources: [
              `arn:aws:ssm:${this.region}:${this.account}:parameter/${this.resourcePrefix}-app/${props.stage}/database/ro-endpoint`,
            ],
          }),
        ],
      })
    );

    const stateMachineName = `${this.resourcePrefix}-ingestion-workflow-state-machine-${props.stage}`;

    const stateMachineRole = new iam.Role(this, 'StateMachineRole', {
      roleName: `${stateMachineName}-role-${props.stage}`,
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    });

    stateMachineRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'states:StartExecution',
          'states:DescribeExecution',
          'states:StopExecution',
        ],
        resources: ['*'],
      })
    );

    activityProxy.grantInvoke(stateMachineRole);
    this.thumbnailBucket.grantReadWrite(functionRole);
    this.landingBucket.grantRead(functionRole);

    const logGroup = new logs.LogGroup(this, 'StateMachineLogGroup', {
      logGroupName: `/aws/stepfunctions/states/${stateMachineName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const parseSnsBody = new sfn.Pass(this, 'Parse SNS Body', {
      parameters: {
        sns_body: sfn.JsonPath.stringToJson(sfn.JsonPath.stringAt('$[0].body')),
      },
    });

    const parseS3Event = new sfn.Pass(this, 'Parse S3 Event', {
      parameters: {
        s3_event: sfn.JsonPath.stringToJson(
          sfn.JsonPath.stringAt('$.sns_body.Message')
        ),
      },
    });

    const loadS3File = new sfnTasks.LambdaInvoke(this, 'Load S3 File', {
      lambdaFunction: activityProxy,
      payload: sfn.TaskInput.fromObject({
        activity: 'load_s3_file_activity',
        args: {
          s3_event: sfn.JsonPath.stringAt('$.s3_event'),
        },
      }),
      resultSelector: {
        load_s3_file_result: sfn.JsonPath.stringAt('$.Payload'),
      },
    });

    const processingBucket = new s3.Bucket(this, 'ProcessingBucket', {
      bucketName: `${this.resourcePrefix}-ingestion-processing-${this.account}-${this.region}-${props.stage}`,
      versioned: true,
    });

    processingBucket.grantRead(functionRole);
    processingBucket.grantReadWrite(stateMachineRole);

    const fileContentMap = new sfn.DistributedMap(this, 'File Content Map', {
      itemsPath: sfn.JsonPath.stringAt(
        '$.load_s3_file_result.file_content_ids'
      ),
      itemSelector: {
        file_id: sfn.JsonPath.stringAt('$.load_s3_file_result.file_id'),
        project_id: sfn.JsonPath.stringAt('$.load_s3_file_result.project_id'),
        file_content_id: sfn.JsonPath.stringAt('$$.Map.Item.Value'),
      },
      resultWriterV2: new sfn.ResultWriterV2({
        bucket: processingBucket,
        prefix: sfn.JsonPath.format(
          'chunks/{}/',
          sfn.JsonPath.stringAt('$.load_s3_file_result.file_id')
        ),
        writerConfig: {
          outputType: sfn.OutputType.JSONL,
          transformation: sfn.Transformation.COMPACT,
        },
      }),
      resultSelector: {
        bucket: sfn.JsonPath.stringAt('$.ResultWriterDetails.Bucket'),
        key: sfn.JsonPath.stringAt('$.ResultWriterDetails.Key'),
      },
      resultPath: '$.file_chunk_map',
    });

    const chunkFileContent = new sfnTasks.LambdaInvoke(
      this,
      'Chunk File Content',
      {
        lambdaFunction: activityProxy,
        payload: sfn.TaskInput.fromObject({
          activity: 'chunk_document_activity',
          args: {
            file_id: sfn.JsonPath.stringAt('$.file_id'),
            project_id: sfn.JsonPath.stringAt('$.project_id'),
            file_content_id: sfn.JsonPath.stringAt('$.file_content_id'),
          },
        }),
        resultSelector: {
          result: sfn.JsonPath.stringAt('$.Payload'),
        },
        resultPath: '$.chunk_document',
      }
    );

    const parseChunkResults = new lambda.Function(this, 'ParseChunkResults', {
      functionName: `${this.resourcePrefix}-ingestion-workflow-parse-chunk-results-${props.stage}`,
      runtime: lambda.Runtime.PYTHON_3_13,
      code: lambda.Code.fromAsset('.aws-lambda-package/project.zip'),
      handler:
        'ingestion_workflow.lambda_functions.parse_chunk_results.handler',
      description: 'Ingestion Workflow Parse Chunk Results Lambda Function',
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(15),
      role: functionRole,
      memorySize: 4096,
      environment: {
        ENV: props.stage,
        LOG_LEVEL: 'INFO',
      },
    });

    processingBucket.grantReadWrite(parseChunkResults);

    const parseChunkResultsTask = new sfnTasks.LambdaInvoke(
      this,
      'Parse Chunk Results',
      {
        lambdaFunction: parseChunkResults,
        payload: sfn.TaskInput.fromObject({
          bucket: sfn.JsonPath.stringAt('$.file_chunk_map.bucket'),
          key: sfn.JsonPath.stringAt('$.file_chunk_map.key'),
          file_id: sfn.JsonPath.stringAt('$.load_s3_file_result.file_id'),
          execution_id: sfn.JsonPath.stringAt('$$.Execution.Id'),
        }),
        resultSelector: {},
        resultPath: '$.parse_chunk_results',
      }
    );

    fileContentMap.itemProcessor(chunkFileContent);

    const fileContentChunksMap = new sfn.DistributedMap(
      this,
      'File Content Chunks Map',
      {
        itemReader: new sfn.S3ObjectsItemReader({
          bucket: processingBucket,
          prefix: sfn.JsonPath.format(
            'numbered_chunks/{}/{}',
            sfn.JsonPath.stringAt('$.load_s3_file_result.file_id'),
            sfn.JsonPath.stringAt('$$.Execution.Id')
          ),
        }),
        resultSelector: {},
        resultPath: '$.file_content_chunks',
      }
    );

    const chunkMap = new sfn.DistributedMap(this, 'Chunk Map', {
      itemReader: new sfn.S3JsonItemReader({
        bucket: processingBucket,
        key: sfn.JsonPath.stringAt('$.Key'),
      }),
      resultSelector: {},
    });

    fileContentChunksMap.itemProcessor(chunkMap);

    const createChunkEmbeddings = new sfnTasks.LambdaInvoke(
      this,
      'Create Chunk Embeddings',
      {
        lambdaFunction: activityProxy,
        payload: sfn.TaskInput.fromObject({
          activity: 'create_chunk_embeddings_activity',
          args: {
            file_id: sfn.JsonPath.stringAt('$.file_id'),
            chunk_id: sfn.JsonPath.stringAt('$.chunk_id'),
            chunk_number: sfn.JsonPath.numberAt('$.chunk_number'),
          },
        }),
        resultSelector: {},
      }
    );

    chunkMap.itemProcessor(createChunkEmbeddings);

    const updateFileStatus = new sfnTasks.LambdaInvoke(
      this,
      'Update File Status',
      {
        lambdaFunction: activityProxy,
        payload: sfn.TaskInput.fromObject({
          activity: 'update_file_status_activity',
          args: {
            file_id: sfn.JsonPath.stringAt('$.load_s3_file_result.file_id'),
            status: 'completed',
          },
        }),
        resultSelector: {},
        resultPath: '$.update_file_status',
      }
    );

    const sendEvent = new sfnTasks.LambdaInvoke(this, 'Send Event', {
      lambdaFunction: activityProxy,
      payload: sfn.TaskInput.fromObject({
        activity: 'send_event_activity',
        args: {
          source: 'ingestion',
          event_type: 'file_ingested_successfully',
          data: {
            file_id: sfn.JsonPath.stringAt('$.load_s3_file_result.file_id'),
          },
        },
      }),
      resultSelector: {},
      resultPath: '$.send_event',
    });

    const definitionBody = sfn.DefinitionBody.fromChainable(
      parseSnsBody
        .next(parseS3Event)
        .next(loadS3File)
        .next(fileContentMap)
        .next(parseChunkResultsTask)
        .next(fileContentChunksMap)
        .next(updateFileStatus)
        .next(sendEvent)
    );

    const stateMachine = new sfn.StateMachine(
      this,
      'IngestionWorkflowStateMachine',
      {
        stateMachineName,
        role: stateMachineRole,
        logs: {
          level: sfn.LogLevel.ALL,
          destination: logGroup,
        },
        tracingEnabled: true,
        definitionBody,
      }
    );

    new pipes.Pipe(this, 'IngestionWorkflowPipe', {
      pipeName: `${this.resourcePrefix}-ingestion-workflow-pipe-${props.stage}`,
      description: 'Pipe to trigger the ingestion workflow',
      source: new pipesSources.SqsSource(this.ingestionQueue),
      target: new pipesTargets.SfnStateMachine(stateMachine, {
        invocationType: pipesTargets.StateMachineInvocationType.FIRE_AND_FORGET,
      }),
    });
  }
}
