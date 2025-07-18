import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

interface GitHubActionsAuthStackProps extends cdk.StackProps {
  stage: string;
  repositoryConfig: { owner: string; repo: string; filter?: string }[];
}

export class GitHubActionsAuthStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: GitHubActionsAuthStackProps
  ) {
    super(scope, id, props);

    const githubDomain = 'token.actions.githubusercontent.com';

    const githubProvider = new iam.OpenIdConnectProvider(
      this,
      'GithubActionsProvider',
      {
        url: `https://${githubDomain}`,
        clientIds: ['sts.amazonaws.com'],
      }
    );

    const iamRepoDeployAccess = props.repositoryConfig.map(
      (repo) => `repo:${repo.owner}/${repo.repo}:${repo.filter ?? '*'}`
    );

    const role = new iam.Role(this, 'gitHubDeployRole', {
      assumedBy: new iam.WebIdentityPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringLike: {
            [`${githubDomain}:sub`]: iamRepoDeployAccess,
          },
          StringEquals: {
            [`${githubDomain}:aud`]: 'sts.amazonaws.com',
          },
        }
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
      ],
      roleName: 'github-actions-deploy-role',
      description:
        'This role is used via GitHub Actions to deploy with AWS CDK or Terraform on the target AWS account',
      maxSessionDuration: cdk.Duration.hours(12),
    });

    new cdk.CfnOutput(this, 'RoleArn', {
      value: role.roleArn,
      description: `GitHub Actions Role Arn for ${props.stage} stage`,
    });
  }
}
