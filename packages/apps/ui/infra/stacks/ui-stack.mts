import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';
import {
  BaseStack,
  BaseStackProps,
  importEksCluster,
} from '@workspace/infra-cdk-shared';
import path from 'path';

const viewerRequestCode = `
function handler(r) {
  var e = r.request;
  return (
    (e.headers["x-forwarded-host"] = e.headers.host),
    e.cookies.__prerender_bypass &&
      (e.headers["x-prerender-bypass"] = { value: "true" }),
    e
  );
}
`;

export class UIStack extends BaseStack {
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
        name: `${this.resourcePrefix}-ui-service-account`,
        namespace: `${this.resourcePrefix}-app`,
      }
    );

    if (props.gitOps.enabled) {
      const argoCDApp = this.registerArgoCDApplication(
        eksCluster,
        props,
        'ui',
        `${this.resourcePrefix}-app`
      );
      argoCDApp.node.addDependency(serviceAccount);
    }

    dbEncryptionKey.grantDecrypt(serviceAccount.role);

    this.grantApplicationPermissions(serviceAccount.role);
  }

  private addServerlessResources(props: BaseStackProps) {
    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `${this.resourcePrefix}-ui-${this.account}-${this.region}-${props.stage}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const architecture = lambda.Architecture.ARM_64;

    const adapterLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      architecture === lambda.Architecture.ARM_64
        ? 'LambdaAdapterLayerArm64'
        : 'LambdaAdapterLayerX86',
      architecture === lambda.Architecture.ARM_64
        ? `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerArm64:25`
        : `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerX86:25`
    );

    const functionRole = new iam.Role(this, 'FunctionRole', {
      roleName: `${this.resourcePrefix}-ui-nextjs-server-${this.region}-${props.stage}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],
    });

    this.grantApplicationPermissions(functionRole);

    const nextJsHandler = new lambda.Function(this, 'NextJsServerHandler', {
      functionName: `${this.resourcePrefix}-ui-nextjs-server-handler-${props.stage}`,
      description: `UI Next.js handler for ${props.stage}`,
      architecture,
      handler: 'run.sh',
      runtime: lambda.Runtime.NODEJS_22_X,
      role: functionRole,
      environment: {
        ENV: props.stage,
        NODE_ENV: 'production',
        AWS_XRAY_CONTEXT_MISSING: 'IGNORE_ERROR',
        AWS_LWA_INVOKE_MODE: 'response_stream',
        PORT: '3000',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        AWS_LWA_ENABLE_COMPRESSION: 'false',

        NEXT_PUBLIC_API_URL: ssm.StringParameter.fromStringParameterName(
          this,
          'APIURLParameter',
          `/${this.resourcePrefix}-app/${props.stage}/api/url`
        ).stringValue,

        // Secrets
        VMX_SECRET_NAME: 'vmx-credentials',
      },
      memorySize: 1024,
      timeout: cdk.Duration.minutes(1),
      layers: [adapterLayer],
      code: lambda.Code.fromAsset(
        path.join(import.meta.dirname, '../../.next/standalone-server.zip')
      ),
    });

    const functionUrl = nextJsHandler.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    const oai = new cloudfront.OriginAccessIdentity(
      this,
      'OriginAccessIdentity',
      {
        comment: `UI origin access identity for ${props.stage}`,
      }
    );

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject*'],
        resources: [bucket.arnForObjects('*')],
        principals: [oai.grantPrincipal],
      })
    );

    const viewerRequestFn = new cloudfront.Function(
      this,
      'NextJsServerViewerRequest',
      {
        functionName: `${this.resourcePrefix}-ui-nextjs-server-viewer-request-${props.stage}`,
        code: cloudfront.FunctionCode.fromInline(viewerRequestCode),
        runtime: cloudfront.FunctionRuntime.JS_1_0,
      }
    );

    const lambdaOrigin = new origins.FunctionUrlOrigin(functionUrl, {
      originId: 'server',
      readTimeout: cdk.Duration.seconds(10),
    });

    const s3Origin = origins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
      originAccessIdentity: oai,
      originPath: '/_assets',
      originId: 'static',
    });

    const cachePolicy = new cloudfront.CachePolicy(this, 'NextJsCachePolicy', {
      cachePolicyName: `${this.resourcePrefix}-ui-nextjs-cache-policy-${props.stage}`,
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(31536000),
      minTtl: cdk.Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'next-url',
        'rsc',
        'x-prerender-revalidate',
        'next-router-prefetch',
        'next-router-state-tree',
        'x-prerender-bypass',
        'accept'
      ),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

    const serverBehavior = {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      functionAssociations: [
        {
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          function: viewerRequestFn,
        },
      ],
      compress: true,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      originRequestPolicy:
        cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      cachePolicy,
    };

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP1_1,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      comment: `File Processing UI distribution for ${props.stage}`,
      defaultBehavior: { origin: lambdaOrigin, ...serverBehavior },
    });

    ['_next/image*'].forEach((path) => {
      distribution.addBehavior(path, lambdaOrigin, serverBehavior);
    });

    // Remove the `ui` prefix if you remove the `basePath` from the Next.js config
    [
      'favicon.ico',
      'img/*',
      'BUILD_ID',
      '.gitkeep',
      '_next/*',
      'ui/_next/*',
    ].forEach((path) => {
      distribution.addBehavior(path, s3Origin, {
        compress: true,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      });
    });

    const publicDeploy = new s3Deploy.BucketDeployment(
      this,
      'PublicBucketDeployment',
      {
        destinationBucket: bucket,
        destinationKeyPrefix: '_assets/ui',
        distribution,
        distributionPaths: ['/favicon.ico', '/img/*', '/BUILD_ID', '/.gitkeep'],
        sources: [
          s3Deploy.Source.asset(path.join(import.meta.dirname, '../../public')),
        ],
        prune: true,
        retainOnDelete: false,
      }
    );

    const nextStaticDeploy = new s3Deploy.BucketDeployment(
      this,
      'NextStaticBucketDeployment',
      {
        destinationBucket: bucket,
        // Remove the `ui` prefix if you remove the `basePath` from the Next.js config
        destinationKeyPrefix: '_assets/ui/_next/static',
        distribution,
        distributionPaths: ['/*'],
        sources: [
          s3Deploy.Source.asset(
            path.join(import.meta.dirname, '../../.next/static')
          ),
        ],
        prune: true,
        retainOnDelete: false,
      }
    );

    nextStaticDeploy.node.addDependency(publicDeploy);
  }

  private grantApplicationPermissions(role: iam.IRole) {
    role.attachInlinePolicy(
      new iam.Policy(this, 'SecretsPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: [
              'secretsmanager:GetSecretValue',
              'secretsmanager:DescribeSecret',
            ],
            resources: [
              `arn:aws:secretsmanager:${this.region}:${this.account}:secret:vmx-credentials*`,
              `arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.resourcePrefix}-credentials*`,
            ],
          }),
        ],
      })
    );
  }
}
