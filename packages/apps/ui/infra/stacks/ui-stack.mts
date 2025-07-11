import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as kms from 'aws-cdk-lib/aws-kms';
import type { Construct } from 'constructs';
import { GitOps, importEksCluster, RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';

interface UIStackProps extends cdk.StackProps {
  stage: string;
  gitOps: GitOps & {
    path: string;
  }
}

export class UIStack extends cdk.Stack {
  private readonly resourcePrefix: string = RESOURCE_PREFIX;

  constructor(scope: Construct, id: string, props: UIStackProps) {
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
        name: `${this.resourcePrefix}-app-ui`,
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
        name: `${this.resourcePrefix}-ui-service-account`,
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
              `arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.resourcePrefix}-credentials*`,
            ],
          }),
        ],
      })
    );
  }
}
