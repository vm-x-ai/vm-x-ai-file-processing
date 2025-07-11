import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as kms from 'aws-cdk-lib/aws-kms';
import type { Construct } from 'constructs';
import { GitOps, importEksCluster, RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';

interface TemporalWorkerStackProps extends cdk.StackProps {
  stage: string;
  gitOps: GitOps & {
    path: string;
  }
}

export class TemporalWorkerStack extends cdk.Stack {
  private readonly resourcePrefix: string = RESOURCE_PREFIX;

  constructor(scope: Construct, id: string, props: TemporalWorkerStackProps) {
    super(scope, id, props);

    const eksCluster = importEksCluster(
      this,
      'EKSCluster',
      props.stage,
      this.resourcePrefix
    );

    eksCluster.addManifest("ArgoCDApp", {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Application',
      metadata: {
        name: `${this.resourcePrefix}-app-temporal-worker`,
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
            valueFiles: [
              `${props.stage}.values.yaml`,
            ],
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
    })

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
        name: `${this.resourcePrefix}-temporal-worker-service-account`,
        namespace: `${this.resourcePrefix}-app`,
      }
    );

    dbEncryptionKey.grantDecrypt(serviceAccount.role);

    serviceAccount.role.attachInlinePolicy(
      new iam.Policy(this, 'SecretsPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: [
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

    serviceAccount.role.attachInlinePolicy(
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

    serviceAccount.role.attachInlinePolicy(
      new iam.Policy(this, 'S3Policy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['s3:GetObject', 's3:ListBucket', 's3:PutObject'],
            resources: [
              `arn:aws:s3:::${this.resourcePrefix}-ingestion-landing-${this.region}-${props.stage}`,
              `arn:aws:s3:::${this.resourcePrefix}-ingestion-landing-${this.region}-${props.stage}/*`,
              `arn:aws:s3:::${this.resourcePrefix}-file-thumbnail-${this.region}-${props.stage}`,
              `arn:aws:s3:::${this.resourcePrefix}-file-thumbnail-${this.region}-${props.stage}/*`,
            ],
          }),
        ],
      })
    );

    serviceAccount.role.attachInlinePolicy(
      new iam.Policy(this, 'EventsPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['events:PutEvents'],
            resources: ['*'],
          }),
        ],
      })
    );
  }
}
