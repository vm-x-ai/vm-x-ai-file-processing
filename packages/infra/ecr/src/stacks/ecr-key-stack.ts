import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import { RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';

interface ECRKeyStackProps extends cdk.StackProps {
  stage: string;
  accountIds: string[];
}

export class ECRKeyStack extends cdk.Stack {
  public readonly encryptionKey: kms.Key;
  private readonly resourcePrefix: string = RESOURCE_PREFIX;

  constructor(scope: Construct, id: string, props: ECRKeyStackProps) {
    super(scope, id, props);

    this.encryptionKey = new kms.Key(this, 'ECRKey', {
      alias: `${this.resourcePrefix}-ecr-key-${props.stage}`,
    });

    const principals = props.accountIds.map(
      (accountId) => new iam.AccountPrincipal(accountId)
    );

    this.encryptionKey.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['kms:Decrypt', 'kms:Encrypt', 'kms:GenerateDataKey'],
        principals,
        resources: ['*'],
      })
    );

    const ecrKmsKeyParameter = new ssm.StringParameter(
      this,
      'ECRKMSKeyParameter',
      {
        parameterName: `/${this.resourcePrefix}-app/${props.stage}/ecr/kms-key`,
        stringValue: this.encryptionKey.keyArn,
      }
    );

    new iam.Role(this, 'ECRKeyCrossAccountSsmFetcherRole', {
      assumedBy: new iam.CompositePrincipal(...principals),
      roleName: `${this.resourcePrefix}-ecr-key-cross-account-role-${props.stage}`,
      inlinePolicies: {
        ECRKeyCrossAccountSsmFetcherPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['ssm:GetParameter'],
              resources: [ecrKmsKeyParameter.parameterArn],
            }),
          ],
        }),
      },
    });
  }
}
