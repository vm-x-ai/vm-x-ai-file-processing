import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import type { Construct } from 'constructs';
import {
  BaseStack,
  BaseStackProps,
  importEksCluster,
} from '@workspace/infra-cdk-shared';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class APIStack extends BaseStack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    if (props.stackMode === 'kubernetes') {
      this.addKubernetesResources(props);
    } else {
      this.addServerlessResources(props);
    }
  }

  private addKubernetesResources(props: BaseStackProps) {
    const eksCluster = importEksCluster(
      this,
      'EKSCluster',
      props.stage,
      this.resourcePrefix
    );

    const dbEncryptionKey = kms.Key.fromKeyArn(
      this,
      'DatabaseSecretKmsKey',
      ssm.StringParameter.fromStringParameterName(
        this,
        'DatabaseSecretKmsKeyArn',
        `/${this.resourcePrefix}-app/${props.stage}/database/secret/kms-key/arn`
      ).stringValue
    );

    const serviceAccount = eksCluster.addServiceAccount(
      'EksAPIServiceAccount',
      {
        name: `${this.resourcePrefix}-api-service-account`,
        namespace: `${this.resourcePrefix}-app`,
      }
    );

    if (props.gitOps.enabled) {
      const argoCDApp = this.registerArgoCDApplication(
        eksCluster,
        props,
        'api',
        `${this.resourcePrefix}-app`
      );

      argoCDApp.node.addDependency(serviceAccount);
    }

    dbEncryptionKey.grantDecrypt(serviceAccount.role);

    this.grantApplicationPermissions(serviceAccount.role, props);
  }

  private addServerlessResources(props: BaseStackProps) {
    const functionRole = new iam.Role(this, 'FunctionRole', {
      roleName: `${this.resourcePrefix}-api-lambda-${this.region}-${props.stage}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    });

    this.grantApplicationPermissions(functionRole, props);

    functionRole.attachInlinePolicy(
      new iam.Policy(this, 'StepFunctionsPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['states:SendTaskSuccess', 'states:StartExecution'],
            resources: ['*'],
          }),
        ],
      })
    );

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

    const apiFunction = new lambda.Function(this, 'API', {
      ...additionalFunctionProps,
      functionName: `${this.resourcePrefix}-api-${props.stage}`,
      runtime: lambda.Runtime.PYTHON_3_13,
      code: lambda.Code.fromAsset('.aws-lambda-package/project.zip'),
      handler: 'run.sh',
      description: 'File Processing FastAPI',
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(15),
      role: functionRole,
      memorySize: 512,
      environment: {
        ENV: props.stage,
        RESOURCE_PREFIX: this.resourcePrefix,
        AWS_ACCOUNT_ID: this.account,
        AWS_LWA_INVOKE_MODE: 'response_stream',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        AWS_LWA_PORT: '8000',
        AWS_LWA_ASYNC_INIT: 'true',
        LANDING_S3_BUCKET_NAME: `${this.resourcePrefix}-ingestion-landing-${this.account}-${this.region}-${props.stage}`,
        AWS_LWA_READINESS_CHECK_PATH: '/health',
        WORKFLOW_ENGINE: 'step_functions',

        // Secrets
        DB_SECRET_NAME: `${this.resourcePrefix}-app-database-secret-${props.stage}`,
        OPENAI_SECRET_NAME: 'openai-credentials',
        ...(additionalFunctionProps.environment ?? {}),
      },
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          'LambdaWebAdapter',
          `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerArm64:25`
        ),
        new lambda.LayerVersion(this, 'DependenciesLayer', {
          code: lambda.Code.fromAsset('.aws-lambda-package/dependencies.zip'),
          compatibleRuntimes: [
            lambda.Runtime.PYTHON_3_11,
            lambda.Runtime.PYTHON_3_12,
            lambda.Runtime.PYTHON_3_13,
          ],
          description: 'Dependencies for the API',
          layerVersionName: `${this.resourcePrefix}-api-dependencies-${props.stage}`,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          compatibleArchitectures: [
            lambda.Architecture.X86_64,
            lambda.Architecture.ARM_64,
          ],
        }),
        ...(additionalFunctionProps.layers ?? []),
      ],
    });

    const apiFunctionUrl = apiFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    new ssm.StringParameter(this, 'APIURLParameter', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/api/url`,
      stringValue: `${apiFunctionUrl.url}api`,
    });
  }

  private grantApplicationPermissions(role: iam.IRole, props: BaseStackProps) {
    role.attachInlinePolicy(
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

    role.attachInlinePolicy(
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

    role.attachInlinePolicy(
      new iam.Policy(this, 'S3Policy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['s3:GetObject', 's3:ListBucket', 's3:PutObject'],
            resources: [
              `arn:aws:s3:::${this.resourcePrefix}-ingestion-landing-${this.account}-${this.region}-${props.stage}`,
              `arn:aws:s3:::${this.resourcePrefix}-ingestion-landing-${this.account}-${this.region}-${props.stage}/*`,
              `arn:aws:s3:::${this.resourcePrefix}-file-thumbnail-${this.account}-${this.region}-${props.stage}`,
              `arn:aws:s3:::${this.resourcePrefix}-file-thumbnail-${this.account}-${this.region}-${props.stage}/*`,
            ],
          }),
        ],
      })
    );
  }
}
