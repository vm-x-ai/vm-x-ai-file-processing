import * as eks from '@aws-cdk/aws-eks-v2-alpha';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

export function importEksCluster(
  scope: Construct,
  id: string,
  stage: string,
  resourcePrefix: string
) {
  return eks.Cluster.fromClusterAttributes(scope, id, {
    clusterName: `${resourcePrefix}-eks-cluster-${stage}`,
    openIdConnectProvider:
      eks.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
        scope,
        'EKSOpenIdConnectProvider',
        ssm.StringParameter.fromStringParameterName(
          scope,
          'EKSOpenIdConnectProviderArn',
          `/${resourcePrefix}-app/${stage}/eks-cluster/open-id-connect-provider-arn`
        ).stringValue
      ),
    kubectlProvider: eks.KubectlProvider.fromKubectlProviderAttributes(
      scope,
      'EKSKubectlProvider',
      {
        serviceToken: ssm.StringParameter.fromStringParameterName(
          scope,
          'EKSKubectlServiceToken',
          `/${resourcePrefix}-app/${stage}/eks-cluster/kubectl/service-token`
        ).stringValue,
        role: iam.Role.fromRoleArn(
          scope,
          'EKSKubectlRole',
          ssm.StringParameter.fromStringParameterName(
            scope,
            'EKSKubectlRoleArn',
            `/${resourcePrefix}-app/${stage}/eks-cluster/kubectl/role-arn`
          ).stringValue
        ),
      }
    ),
  });
}
