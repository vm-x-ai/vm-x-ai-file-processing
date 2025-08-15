import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import {
  BaseStack,
  BaseStackProps,
  importEksCluster,
} from '@workspace/infra-cdk-shared';

export class EvaluationWorkflowStack extends BaseStack {
  private readonly eventBus: events.IEventBus;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    this.eventBus = events.EventBus.fromEventBusName(
      this,
      'EventBus',
      `${this.resourcePrefix}-event-bus-${props.stage}`
    );

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
      'EksEvaluationWorkflowServiceAccount',
      {
        name: `${this.resourcePrefix}-evaluation-workflow-service-account`,
        namespace: `${this.resourcePrefix}-app`,
      }
    );

    if (props.gitOps.enabled) {
      const argoCDApp = this.registerArgoCDApplication(
        eksCluster,
        props,
        'evaluation-workflow-sqs-consumer',
        `${this.resourcePrefix}-app`
      );
      argoCDApp.node.addDependency(serviceAccount);
    }

    const evaluationQueue = new sqs.Queue(this, 'EvaluationWorkflowQueue', {
      queueName: `${this.resourcePrefix}-evaluation-workflow-${this.region}-${props.stage}`,
    });

    evaluationQueue.grantConsumeMessages(serviceAccount.role);

    new events.Rule(this, 'EvaluationWorkflowTriggerRule', {
      eventBus: this.eventBus,
      eventPattern: {
        detailType: ['file_ingested_successfully'],
      },
      ruleName: `${this.resourcePrefix}-evaluation-workflow-${this.region}-${props.stage}`,
      targets: [
        new targets.SqsQueue(evaluationQueue, {
          message: events.RuleTargetInput.fromEventPath('$.detail'),
        }),
      ],
    });
  }

  private addServerlessResources(props: BaseStackProps) {
    const functionRole = new iam.Role(this, 'FunctionRole', {
      roleName: `${this.resourcePrefix}-evaluation-workflow-lambda-${this.region}-${props.stage}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    });

    this.eventBus.grantPutEventsTo(functionRole);

    let additionalFunctionProps: Partial<lambda.FunctionProps> = {};
    const baseFunctionProps = {
      runtime: lambda.Runtime.PYTHON_3_13,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(15),
      role: functionRole,
      code: lambda.Code.fromAsset('.aws-lambda-package/project.zip'),
    };

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
        layerVersionName: `${this.resourcePrefix}-evaluation-workflow-dependencies-${props.stage}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        compatibleArchitectures: [
          lambda.Architecture.X86_64,
          lambda.Architecture.ARM_64,
        ],
      }
    );

    const baseEnvVars = {
      ENV: props.stage,
      LOG_LEVEL: 'INFO',
      INGESTION_CALLBACK_URL: `${
        ssm.StringParameter.fromStringParameterName(
          this,
          'APIURLParameter',
          `/${this.resourcePrefix}-app/${props.stage}/api/url`
        ).stringValue
      }/ingestion-callback`,

      // Secrets
      VMX_SECRET_NAME: 'vmx-credentials',
      OPENAI_SECRET_NAME: 'openai-credentials',
      DB_SECRET_NAME: `${this.resourcePrefix}-app-database-secret-${props.stage}`,
      ...(additionalFunctionProps.environment ?? {}),
    };

    const activityProxy = new lambda.Function(
      this,
      'EvaluationWorkflowActivityProxy',
      {
        ...additionalFunctionProps,
        ...baseFunctionProps,
        functionName: `${this.resourcePrefix}-evaluation-workflow-activity-proxy-${props.stage}`,
        handler: 'evaluation_workflow.lambda_functions.activity_proxy.handler',
        description: 'Evaluation Workflow Activity Proxy Lambda Function',
        memorySize: 4096,
        environment: { ...baseEnvVars },
        layers: [dependenciesLayer, ...(additionalFunctionProps.layers ?? [])],
      }
    );

    const initialEvaluationSetup = new lambda.Function(
      this,
      'InitialEvaluationSetup',
      {
        ...additionalFunctionProps,
        ...baseFunctionProps,
        functionName: `${this.resourcePrefix}-evaluation-workflow-initial-eval-setup-${props.stage}`,
        handler:
          'evaluation_workflow.lambda_functions.initial_evaluation_setup.handler',
        description:
          'Evaluation Workflow Initial Evaluation Setup Lambda Function',
        memorySize: 128,
        environment: {
          ENV: props.stage,
          LOG_LEVEL: 'INFO',
          ...(additionalFunctionProps.environment ?? {}),
        },
        layers: [...(additionalFunctionProps.layers ?? [])],
      }
    );

    const generateLlmRequests = new lambda.Function(
      this,
      'GenerateLlmRequests',
      {
        ...additionalFunctionProps,
        ...baseFunctionProps,
        functionName: `${this.resourcePrefix}-evaluation-workflow-generate-llm-requests-${props.stage}`,
        handler:
          'evaluation_workflow.lambda_functions.generate_llm_requests.handler',
        description:
          'Evaluation Workflow Generate LLM Requests Lambda Function',
        memorySize: 1024,
        environment: { ...baseEnvVars },
        layers: [dependenciesLayer, ...(additionalFunctionProps.layers ?? [])],
      }
    );

    const sendLlmRequest = new lambda.Function(this, 'SendLlmRequest', {
      ...additionalFunctionProps,
      ...baseFunctionProps,
      functionName: `${this.resourcePrefix}-evaluation-workflow-send-llm-request-${props.stage}`,
      handler: 'evaluation_workflow.lambda_functions.send_llm_request.handler',
      description: 'Evaluation Workflow Send LLM Request Lambda Function',
      memorySize: 1024,
      environment: { ...baseEnvVars },
      layers: [dependenciesLayer, ...(additionalFunctionProps.layers ?? [])],
    });

    const processEvaluationResult = new lambda.Function(
      this,
      'ProcessEvaluationResult',
      {
        ...additionalFunctionProps,
        ...baseFunctionProps,
        functionName: `${this.resourcePrefix}-evaluation-workflow-process-eval-result-${props.stage}`,
        handler:
          'evaluation_workflow.lambda_functions.process_evaluation_result.handler',
        description:
          'Evaluation Workflow Process Evaluation Result Lambda Function',
        memorySize: 128,
        environment: {
          ENV: props.stage,
          LOG_LEVEL: 'INFO',
          ...(additionalFunctionProps.environment ?? {}),
        },
        layers: [...(additionalFunctionProps.layers ?? [])],
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

    const processingBucket = new s3.Bucket(this, 'ProcessingBucket', {
      bucketName: `${this.resourcePrefix}-eval-processing-${this.account}-${this.region}-${props.stage}`,
      versioned: true,
    });

    const stateMachineRole = new iam.Role(this, 'StateMachineRole', {
      roleName: `${this.resourcePrefix}-evaluation-workflow-state-machine-role-${props.stage}`,
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
    });

    processingBucket.grantReadWrite(functionRole);
    processingBucket.grantReadWrite(stateMachineRole);

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
    initialEvaluationSetup.grantInvoke(stateMachineRole);
    generateLlmRequests.grantInvoke(stateMachineRole);
    sendLlmRequest.grantInvoke(stateMachineRole);
    processEvaluationResult.grantInvoke(stateMachineRole);

    const definitionBody = sfn.DefinitionBody.fromChainable(
      new sfn.Pass(this, 'Init Evaluation ID', {
        parameters: {
          file_id: sfn.JsonPath.stringAt('$.file_id'),
          evaluation_id: sfn.JsonPath.DISCARD,
        },
      })
        .next(
          this.generateProcessEvaluationDefinition(
            'initial-eval',
            processingBucket,
            initialEvaluationSetup,
            generateLlmRequests,
            sendLlmRequest,
            activityProxy,
            processEvaluationResult
          )
        )
    );

    const stateMachineName = `${this.resourcePrefix}-evaluation-workflow-state-machine-${props.stage}`;
    const stateMachine = new sfn.StateMachine(
      this,
      'EvaluationWorkflowStateMachine',
      {
        stateMachineName,
        role: stateMachineRole,
        logs: {
          level: sfn.LogLevel.ALL,
          destination: new logs.LogGroup(this, 'StateMachineLogGroup', {
            logGroupName: `/aws/stepfunctions/states/${stateMachineName}`,
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          }),
        },
        tracingEnabled: true,
        definitionBody,
      }
    );

    new events.Rule(this, 'EvaluationWorkflowTriggerRule', {
      eventBus: this.eventBus,
      eventPattern: {
        detailType: ['file_ingested_successfully'],
      },
      ruleName: `${this.resourcePrefix}-evaluation-workflow-${this.region}-${props.stage}`,
      targets: [
        new targets.SfnStateMachine(stateMachine, {
          input: events.RuleTargetInput.fromEventPath('$.detail'),
        }),
      ],
    });

    const updateStateMachineName = `${this.resourcePrefix}-update-evaluation-workflow-state-machine-${props.stage}`;

    const getFilesToEvaluateTask = new sfnTasks.LambdaInvoke(
      this,
      'Get Files to Evaluate',
      {
        lambdaFunction: activityProxy,
        payload: sfn.TaskInput.fromObject({
          activity: 'get_files_to_evaluate_activity',
          args: {
            evaluation: sfn.JsonPath.stringAt('$.evaluation'),
            old_evaluation: sfn.JsonPath.stringAt('$.old_evaluation'),
          },
        }),
        resultSelector: {
          result: sfn.JsonPath.stringAt('$.Payload'),
        },
        resultPath: '$.files_to_evaluate',
      }
    );

    const fileMap = new sfn.Map(this, 'File Map', {
      itemsPath: '$.files_to_evaluate.result',
      itemSelector: {
        file_id: sfn.JsonPath.stringAt('$$.Map.Item.Value'),
        evaluation_id: sfn.JsonPath.stringAt('$.evaluation.id'),
      },
    });

    fileMap.itemProcessor(
      this.generateProcessEvaluationDefinition(
        'update-eval',
        processingBucket,
        initialEvaluationSetup,
        generateLlmRequests,
        sendLlmRequest,
        activityProxy,
        processEvaluationResult
      )
    );

    const updateDefinitionBody = sfn.DefinitionBody.fromChainable(
      getFilesToEvaluateTask.next(fileMap)
    );

    new sfn.StateMachine(this, 'UpdateEvaluationWorkflowStateMachine', {
      stateMachineName: updateStateMachineName,
      role: stateMachineRole,
      logs: {
        level: sfn.LogLevel.ALL,
        destination: new logs.LogGroup(this, 'UpdateStateMachineLogGroup', {
          logGroupName: `/aws/stepfunctions/states/${updateStateMachineName}`,
          retention: logs.RetentionDays.ONE_MONTH,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      },
      tracingEnabled: true,
      definitionBody: updateDefinitionBody,
    });
  }

  private generateProcessEvaluationDefinition(
    id: string,
    processingBucket: s3.Bucket,
    initialEvaluationSetup: lambda.Function,
    generateLlmRequests: lambda.Function,
    sendLlmRequest: lambda.Function,
    activityProxy: lambda.Function,
    processEvaluationResult: lambda.Function
  ) {
    const initialEvaluationSetupTask = new sfnTasks.LambdaInvoke(
      this,
      `${id}-Initial-Evaluation-Setup`,
      {
        stateName: 'Initial Evaluation Setup',
        lambdaFunction: initialEvaluationSetup,
        payload: sfn.TaskInput.fromObject({
          file_id: sfn.JsonPath.stringAt('$.file_id'),
          evaluation_id: sfn.JsonPath.stringAt('$.evaluation_id'),
          bucket_name: processingBucket.bucketName,
        }),
        resultSelector: {
          s3_key: sfn.JsonPath.stringAt('$.Payload.s3_key'),
        },
        resultPath: '$.next_evaluation_result',
      }
    );

    const evalMap = new sfn.DistributedMap(this, `${id}-Evaluation-Map`, {
      stateName: 'Evaluation Map',
      itemReader: new sfn.S3JsonItemReader({
        bucket: processingBucket,
        key: sfn.JsonPath.stringAt('$.next_evaluation_result.s3_key'),
      }),
      resultWriterV2: new sfn.ResultWriterV2({
        bucket: processingBucket,
        prefix: sfn.JsonPath.format(
          'evaluations_map/file_id={}/',
          sfn.JsonPath.stringAt('$.file_id')
        ),
        writerConfig: {
          outputType: sfn.OutputType.JSON,
          transformation: sfn.Transformation.COMPACT,
        },
      }),
      resultSelector: {
        bucket: sfn.JsonPath.stringAt('$.ResultWriterDetails.Bucket'),
        key: sfn.JsonPath.stringAt('$.ResultWriterDetails.Key'),
      },
      resultPath: '$.evaluation_result',
    });

    const generateLlmRequestsTask = new sfnTasks.LambdaInvoke(
      this,
      `${id}-Generate-LLM-Requests`,
      {
        stateName: 'Generate LLM Requests',
        lambdaFunction: generateLlmRequests,
        payload: sfn.TaskInput.fromObject({
          file_id: sfn.JsonPath.stringAt('$.file_id'),
          workflow_id: sfn.JsonPath.stringAt('$$.Execution.Name'),
          evaluation_id: sfn.JsonPath.stringAt('$.evaluation_id'),
          parent_evaluation_id: sfn.JsonPath.stringAt('$.parent_evaluation_id'),
          parent_evaluation_option: sfn.JsonPath.stringAt(
            '$.parent_evaluation_option'
          ),
          parent_file_content_id: sfn.JsonPath.stringAt(
            '$.parent_file_content_id'
          ),
          bucket_name: processingBucket.bucketName,
        }),
        resultSelector: {
          result: sfn.JsonPath.stringAt('$.Payload'),
        },
        resultPath: '$.generate_llm_requests',
      }
    );

    const llmRequestMap = new sfn.DistributedMap(
      this,
      `${id}-LLM-Request-Map`,
      {
        stateName: 'LLM Request Map',
        itemReader: new sfn.S3JsonItemReader({
          bucket: processingBucket,
          key: sfn.JsonPath.stringAt('$.generate_llm_requests.result.s3_key'),
        }),
        resultWriterV2: new sfn.ResultWriterV2({
          bucket: processingBucket,
          prefix: sfn.JsonPath.format(
            'llm_requests/file_id={}/evaluation_id={}/parent_evaluation_id={}/parent_evaluation_option={}/parent_file_content_id={}/',
            sfn.JsonPath.stringAt('$.file_id'),
            sfn.JsonPath.stringAt('$.evaluation_id'),
            sfn.JsonPath.stringAt('$.parent_evaluation_id'),
            sfn.JsonPath.stringAt('$.parent_evaluation_option'),
            sfn.JsonPath.stringAt('$.parent_file_content_id')
          ),
          writerConfig: {
            outputType: sfn.OutputType.JSON,
            transformation: sfn.Transformation.COMPACT,
          },
        }),
        resultPath: '$.llm_requests',
        resultSelector: {
          bucket: sfn.JsonPath.stringAt('$.ResultWriterDetails.Bucket'),
          key: sfn.JsonPath.stringAt('$.ResultWriterDetails.Key'),
        },
      }
    );

    const sendLlmRequestTask = new sfnTasks.LambdaInvoke(
      this,
      `${id}-Send-LLM-Request`,
      {
        stateName: 'Send LLM Request',
        lambdaFunction: sendLlmRequest,
        payload: sfn.TaskInput.fromObject({
          request: sfn.JsonPath.stringAt('$.llm_request'),
          taskToken: sfn.JsonPath.stringAt('$$.Task.Token'),
        }),
        resultSelector: {
          result: sfn.JsonPath.stringAt('$'),
        },
        resultPath: '$.send_llm_request',
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      }
    );

    const storeEvaluationResult = new sfnTasks.LambdaInvoke(
      this,
      `${id}-Store-Evaluation-Result`,
      {
        stateName: 'Store Evaluation Result',
        lambdaFunction: activityProxy,
        payload: sfn.TaskInput.fromObject({
          activity: 'store_evaluation_activity',
          args: {
            file_id: sfn.JsonPath.stringAt('$.file_id'),
            evaluation_id: sfn.JsonPath.stringAt(
              '$.llm_request.metadata.evaluation_id'
            ),
            file_content_id: sfn.JsonPath.stringAt(
              '$.llm_request.metadata.file_content_id'
            ),
            result: sfn.JsonPath.stringAt('$.send_llm_request.result'),
          },
        }),
        resultSelector: {
          result: sfn.JsonPath.stringAt('$.Payload'),
        },
        resultPath: '$.store_evaluation_response',
      }
    );

    llmRequestMap.itemProcessor(sendLlmRequestTask.next(storeEvaluationResult));

    const processEvaluationResultTask = new sfnTasks.LambdaInvoke(
      this,
      `${id}-Process-Evaluation-Result`,
      {
        stateName: 'Process Evaluation Result',
        lambdaFunction: processEvaluationResult,
        payload: sfn.TaskInput.fromObject({
          file_id: sfn.JsonPath.stringAt('$.file_id'),
          evaluation_id: sfn.JsonPath.stringAt('$.evaluation_id'),
          bucket_name: sfn.JsonPath.stringAt('$.evaluation_result.bucket'),
          s3_key: sfn.JsonPath.stringAt('$.evaluation_result.key'),
        }),
        resultSelector: {
          s3_key: sfn.JsonPath.stringAt('$.Payload.s3_key'),
        },
        resultPath: '$.next_evaluation_result',
      }
    );

    const updateFileStatus = new sfnTasks.LambdaInvoke(
      this,
      `${id}-Update-File-Status`,
      {
        stateName: 'Update File Status',
        lambdaFunction: activityProxy,
        payload: sfn.TaskInput.fromObject({
          activity: 'update_file_status_activity',
          args: {
            file_id: sfn.JsonPath.stringAt('$.file_id'),
            status: 'completed',
          },
        }),
        resultSelector: {},
        resultPath: '$.update_file_status',
      }
    );

    const shouldContinueTask = new sfn.Choice(this, `${id}-Should-Continue`, {
      stateName: 'Should Continue?',
    })
      .when(
        sfn.Condition.isNotNull(
          sfn.JsonPath.stringAt('$.next_evaluation_result.s3_key')
        ),
        evalMap.next(processEvaluationResultTask)
      )
      .otherwise(updateFileStatus);

    evalMap.itemProcessor(generateLlmRequestsTask.next(llmRequestMap));
    processEvaluationResultTask.next(shouldContinueTask);

    return initialEvaluationSetupTask.next(shouldContinueTask);
  }
}
