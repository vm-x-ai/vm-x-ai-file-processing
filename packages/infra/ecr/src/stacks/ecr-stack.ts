import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import { RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';

interface ECRStackProps extends cdk.StackProps {
  stage: string;
  accountIds: string[];
  repositoryName: string;
  encryptionKey: kms.Key;
}

export class ECRStack extends cdk.Stack {
  private readonly resourcePrefix: string = RESOURCE_PREFIX;

  constructor(scope: Construct, id: string, props: ECRStackProps) {
    super(scope, id, props);

    const ecrRepository = new ecr.Repository(
      this,
      `ECRRepository-${props.repositoryName}`,
      {
        repositoryName: `${this.resourcePrefix}-${props.repositoryName}-ecr-${props.stage}`,
        encryption: ecr.RepositoryEncryption.KMS,
        encryptionKey: props.encryptionKey,
      }
    );

    props.accountIds.forEach((accountId) => {
      ecrRepository.grantPullPush(new iam.AccountPrincipal(accountId));
    });

    new ssm.StringParameter(
      this,
      `ECRRepositoryArnParameter-${props.repositoryName}`,
      {
        parameterName: `/${this.resourcePrefix}-app/${props.stage}/ecr/repository/${props.repositoryName}/arn`,
        stringValue: ecrRepository.repositoryArn,
      }
    );

    new ssm.StringParameter(
      this,
      `ECRRepositoryNameParameter-${props.repositoryName}`,
      {
        parameterName: `/${this.resourcePrefix}-app/${props.stage}/ecr/repository/${props.repositoryName}/name`,
        stringValue: ecrRepository.repositoryName,
      }
    );

    new ssm.StringParameter(
      this,
      `ECRRepositoryUriParameter-${props.repositoryName}`,
      {
        parameterName: `/${this.resourcePrefix}-app/${props.stage}/ecr/repository/${props.repositoryName}/url`,
        stringValue: ecrRepository.repositoryUri,
      }
    );
  }
}
