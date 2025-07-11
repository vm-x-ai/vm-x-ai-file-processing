import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as kms from 'aws-cdk-lib/aws-kms';
import type { Construct } from 'constructs';
import {
  BaseStack,
  BaseStackProps,
  importEksCluster,
} from '@workspace/infra-cdk-shared';

export class TemporalWorkerStack extends BaseStack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const eksCluster = importEksCluster(
      this,
      'EKSCluster',
      props.stage,
      this.resourcePrefix
    );

    const argoCDApp = this.registerArgoCDApplication(
      eksCluster,
      props,
      'temporal-worker',
      `${this.resourcePrefix}-app`
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
        name: `${this.resourcePrefix}-temporal-worker-service-account`,
        namespace: `${this.resourcePrefix}-app`,
      }
    );

    argoCDApp.node.addDependency(serviceAccount);

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
              `arn:aws:s3:::${this.resourcePrefix}-ingestion-landing-${this.account}-${this.region}-${props.stage}`,
              `arn:aws:s3:::${this.resourcePrefix}-ingestion-landing-${this.account}-${this.region}-${props.stage}/*`,
              `arn:aws:s3:::${this.resourcePrefix}-file-thumbnail-${this.account}-${this.region}-${props.stage}`,
              `arn:aws:s3:::${this.resourcePrefix}-file-thumbnail-${this.account}-${this.region}-${props.stage}/*`,
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
