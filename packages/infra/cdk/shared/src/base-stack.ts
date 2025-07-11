import { ICluster, KubernetesObjectValue } from '@aws-cdk/aws-eks-v2-alpha';
import * as cdk from 'aws-cdk-lib';
import { GitOps, RESOURCE_PREFIX } from './consts/index.js';
import { Construct } from 'constructs';

export interface BaseStackProps extends cdk.StackProps {
  stage: string;
  sharedServicesAccountId: string;
  gitOps: GitOps & {
    path: string;
  };
}

export class BaseStack extends cdk.Stack {
  protected readonly resourcePrefix: string = RESOURCE_PREFIX;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);
  }

  protected registerArgoCDApplication(
    eksCluster: ICluster,
    props: BaseStackProps,
    appName: string,
    namespace: string
  ) {
    const ingressGatewayAddress = new KubernetesObjectValue(
      this,
      'IngressGatewayAddress',
      {
        cluster: eksCluster,
        objectType: 'service',
        objectName: 'ingressgateway',
        objectNamespace: 'istio-system',
        jsonPath: '.status.loadBalancer.ingress[0].hostname',
      }
    );

    return eksCluster.addManifest('ArgoCDApp', {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Application',
      metadata: {
        name: `${this.resourcePrefix}-app-${appName}`,
        namespace: 'argocd',
      },
      spec: {
        destination: {
          namespace: namespace,
          server: 'https://kubernetes.default.svc',
        },
        project: 'default',
        source: {
          path: props.gitOps.path,
          repoURL: props.gitOps.repoUrl,
          targetRevision: props.gitOps.targetRevision,
          helm: {
            valueFiles: [`${props.stage}.values.yaml`],
            parameters: [
              {
                name: 'namespace',
                value: namespace,
              },
              {
                name: 'sharedServicesAccountId',
                value: props.sharedServicesAccountId,
              },
              {
                name: 'ecrRepositoryName',
                value: `${props.sharedServicesAccountId}.dkr.ecr.${this.region}.amazonaws.com/${this.resourcePrefix}-${appName}-ecr-shared`,
              },
              {
                name: 'resourcePrefix',
                value: this.resourcePrefix,
              },
              {
                name: 'stage',
                value: props.stage,
              },
              {
                name: 'awsRegion',
                value: this.region,
              },
              {
                name: 'awsAccountId',
                value: this.account,
              },
              {
                name: 'ingressGatewayAddress',
                value: ingressGatewayAddress.value,
              },
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
    });
  }
}
