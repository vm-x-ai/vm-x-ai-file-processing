import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as kms from 'aws-cdk-lib/aws-kms';
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
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });

    this.grantApplicationPermissions(functionRole, props);

    const apiFunction = new lambda.Function(this, 'API', {
      functionName: `${this.resourcePrefix}-api-${props.stage}`,
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('.aws-lambda-package/project.zip'),
      handler: 'run.sh',
      description: 'File Processing FastAPI',
      architecture: lambda.Architecture.X86_64,
      timeout: cdk.Duration.minutes(15),
      role: functionRole,
      memorySize: 1024,
      environment: {
        ENV: props.stage,
        RUST_LOG: 'info',
        AWS_LWA_INVOKE_MODE: 'response_stream',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        AWS_LWA_PORT: '8000',
        AWS_LWA_READINESS_CHECK_PATH: '/health',
        AWS_LWA_ASYNC_INIT: 'true',
        LANDING_S3_BUCKET_NAME: `${this.resourcePrefix}-ingestion-landing-${this.account}-${this.region}-${props.stage}`,

        // Secrets
        DB_SECRET_NAME: `${this.resourcePrefix}-app-database-secret-${props.stage}`,
        OPENAI_API_KEY_SECRET_NAME: 'openai-credentials',
      },
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          'LambdaWebAdapter',
          `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerX86:25`
        ),
        new lambda.LayerVersion(this, 'DependenciesLayer', {
          code: lambda.Code.fromAsset('.aws-lambda-package/dependencies.zip'),
          compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
          description: 'Dependencies for the API',
          layerVersionName: `${this.resourcePrefix}-api-dependencies-${props.stage}`,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          compatibleArchitectures: [lambda.Architecture.X86_64],
        }),
      ],
    });

    apiFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
      },
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
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
          new iam.PolicyStatement({
            actions: ['secretsmanager:BatchGetSecretValue'],
            resources: [
              `*`,
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
