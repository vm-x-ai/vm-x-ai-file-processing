import * as cdk from 'aws-cdk-lib';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import * as eks from '@aws-cdk/aws-eks-v2-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cr from 'aws-cdk-lib/custom-resources';
import type { Construct } from 'constructs';
import { KubectlV33Layer } from '@aws-cdk/lambda-layer-kubectl-v33';
import * as yaml from 'js-yaml';
import request, { Response, HttpVerb } from 'sync-request';
import { RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';

interface EKSStackProps extends cdk.StackProps {
  stage: string;
  adminRoleArn: string;
  ecrAccountId: string;
  ecrRepositoryPrefix: string;
  gitOps: {
    repoUrl: string;
    path: string;
    targetRevision: string;
    secretName: string;
  };
}

export enum KubernetesSecretType {
  OPAQUE = 'Opaque',
  BASIC_AUTH = 'kubernetes.io/basic-auth',
  TOKEN = 'bootstrap.kubernetes.io/token',
  DOCKER_CONFIG_JSON = 'kubernetes.io/dockerconfigjson',
  DOCKER_CONFIG = 'kubernetes.io/dockercfg',
  SSH_AUTH = 'kubernetes.io/ssh-auth',
  SERVICE_ACCOUNT_TOKEN = 'kubernetes.io/service-account-token',
  TLS = 'kubernetes.io/tls',
}

enum AwsSecretType {
  SSMPARAMETER = 'ssmparameter',
  SECRETSMANAGER = 'secretsmanager',
}

export class EKSStack extends cdk.Stack {
  private readonly stage: string;
  private readonly resourcePrefix: string = RESOURCE_PREFIX;
  private readonly cluster: eks.Cluster;
  private readonly nodeRole: iam.Role;
  private readonly vpc: cdk.aws_ec2.IVpc;
  private readonly securityGroup: cdk.aws_ec2.SecurityGroup;
  private readonly appNamespace: eks.KubernetesManifest;
  private readonly secretsStoreInstaller: eks.KubernetesManifest;
  private readonly istioGateway: eks.HelmChart;

  constructor(scope: Construct, id: string, props: EKSStackProps) {
    super(scope, id, props);

    this.stage = props.stage;
    this.vpc = Vpc.fromLookup(this, 'Vpc', {
      vpcName: `${this.resourcePrefix}-app-vpc-${props.stage}`,
    });

    const mastersRole = new iam.Role(this, 'MastersRole', {
      assumedBy: new iam.AccountRootPrincipal(),
      roleName: `${this.resourcePrefix}-eks-cluster-masters-role-${props.stage}`,
    });

    const clusterRole = new iam.Role(this, 'ClusterRole', {
      assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
      roleName: `${this.resourcePrefix}-eks-cluster-role-${props.stage}`,
    });

    clusterRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy')
    );

    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for EKS cluster',
      securityGroupName: `${this.resourcePrefix}-eks-cluster-security-group-${props.stage}`,
    });

    const secretsEncryptionKey = new kms.Key(this, 'SecretsEncryptionKey', {
      alias: `${this.resourcePrefix}-eks-cluster-secrets-encryption-key-${props.stage}`,
    });

    secretsEncryptionKey.grant(clusterRole, 'kms:DescribeKey');
    secretsEncryptionKey.grantDecrypt(clusterRole);

    secretsEncryptionKey.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [clusterRole],
        actions: ['kms:Decrypt', 'kms:DescribeKey'],
        resources: ['*'],
      })
    );

    this.nodeRole = new iam.Role(this, 'NodeRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: `${this.resourcePrefix}-eks-cluster-node-role-${props.stage}`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonEC2ContainerRegistryReadOnly'
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSSMManagedInstanceCore'
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonEBSCSIDriverPolicy'
        ),
      ],
    });

    this.nodeRole.attachInlinePolicy(
      new iam.Policy(this, 'ECRPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: [
              'ecr:GetAuthorizationToken',
              'ecr:BatchCheckLayerAvailability',
              'ecr:GetDownloadUrlForLayer',
              'ecr:GetRepositoryPolicy',
              'ecr:DescribeRepositories',
              'ecr:ListImages',
              'ecr:BatchGetImage',
            ],
            resources: [
              `arn:aws:ecr:${this.region}:${props.ecrAccountId}:repository/${props.ecrRepositoryPrefix}*`,
            ],
          }),
        ],
      })
    );

    const ecrKeyParameter = new cr.AwsCustomResource(this, 'ECRKeyParameter', {
      onUpdate: {
        service: 'SSM',
        action: 'getParameter',
        parameters: {
          Name: `/${this.resourcePrefix}-app/shared/ecr/kms-key`,
          WithDecryption: false,
        },
        physicalResourceId: cr.PhysicalResourceId.of(
          'CrossAccountSSMParameter'
        ),
        region: 'us-east-1',
        assumedRoleArn: `arn:aws:iam::${props.ecrAccountId}:role/${this.resourcePrefix}-ecr-key-cross-account-role-shared`,
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    this.nodeRole.attachInlinePolicy(
      new iam.Policy(this, 'ECRKeyPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['kms:Decrypt', 'kms:Encrypt', 'kms:GenerateDataKey'],
            resources: [ecrKeyParameter.getResponseField('Parameter.Value')],
          }),
        ],
      })
    );

    this.cluster = new eks.Cluster(this, 'Cluster', {
      clusterName: `${this.resourcePrefix}-eks-cluster-${props.stage}`,
      vpc: this.vpc,
      vpcSubnets: [
        {
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      version: eks.KubernetesVersion.of('1.33'),
      kubectlProviderOptions: {
        kubectlLayer: new KubectlV33Layer(this, 'KubectlLayer33'),
      },
      defaultCapacityType: eks.DefaultCapacityType.AUTOMODE,
      mastersRole,
      endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
      securityGroup: this.securityGroup,
      secretsEncryptionKey,
      tags: {
        stage: props.stage,
      },
      clusterLogging: [
        eks.ClusterLoggingTypes.API,
        eks.ClusterLoggingTypes.AUDIT,
        eks.ClusterLoggingTypes.AUTHENTICATOR,
        eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
        eks.ClusterLoggingTypes.SCHEDULER,
      ],
      role: clusterRole,
      compute: {
        nodeRole: this.nodeRole,
        nodePools: ['system', 'general-purpose'],
      },
    });

    new eks.AccessEntry(this, 'AWSAdminAccess', {
      cluster: this.cluster,
      principal: props.adminRoleArn,
      accessEntryName: 'AWSAdminAccess',
      accessEntryType: eks.AccessEntryType.STANDARD,
      accessPolicies: [
        eks.AccessPolicy.fromAccessPolicyName('AmazonEKSAdminPolicy', {
          accessScopeType: eks.AccessScopeType.CLUSTER,
        }),
        eks.AccessPolicy.fromAccessPolicyName('AmazonEKSClusterAdminPolicy', {
          accessScopeType: eks.AccessScopeType.CLUSTER,
        }),
        eks.AccessPolicy.fromAccessPolicyName('AmazonEKSAutoNodePolicy', {
          accessScopeType: eks.AccessScopeType.CLUSTER,
        }),
      ],
    });

    secretsEncryptionKey.grantEncryptDecrypt(this.nodeRole);

    const defaultNodeGroupLaunchTemplate = new ec2.LaunchTemplate(
      this,
      'DefaultNodeGroupLaunchTemplate',
      {
        launchTemplateName: `${this.resourcePrefix}-eks-cluster-default-nodegroup-launch-template-${props.stage}`,
        requireImdsv2: false,
      }
    );

    cdk.Tags.of(defaultNodeGroupLaunchTemplate).add(
      'Name',
      `${this.resourcePrefix}-eks-cluster-default-nodegroup-${props.stage}`
    );
    cdk.Tags.of(defaultNodeGroupLaunchTemplate).add('stage', props.stage);
    cdk.Tags.of(defaultNodeGroupLaunchTemplate).add(
      'cluster',
      this.cluster.clusterName
    );
    cdk.Tags.of(defaultNodeGroupLaunchTemplate).add('nodegroup', 'default');

    this.appNamespace = new eks.KubernetesManifest(this, 'AppNamespace', {
      cluster: this.cluster,
      manifest: [
        {
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: {
            name: `${this.resourcePrefix}-app`,
          },
        },
      ],
      overwrite: true,
      prune: true,
    });

    this.secretsStoreInstaller = this.addSecretsStore();

    this.addVpcCni();
    this.addEbsCsiDriver();
    this.istioGateway = this.addIstio();
    this.addArgoCD(props);

    new ssm.StringParameter(this, 'ClusterSecurityGroupId', {
      parameterName: `/${this.resourcePrefix}-app/${this.stage}/eks-cluster/security-group-id`,
      stringValue: this.cluster.clusterSecurityGroupId,
      description: 'Security group ID for EKS cluster',
    });

    new ssm.StringParameter(this, 'ClusterOpenIdConnectProviderArn', {
      parameterName: `/${this.resourcePrefix}-app/${this.stage}/eks-cluster/open-id-connect-provider-arn`,
      stringValue: this.cluster.openIdConnectProvider.openIdConnectProviderArn,
      description: 'Open ID Connect provider ARN for EKS cluster',
    });

    new ssm.StringParameter(this, 'ClusterKubectlServiceToken', {
      parameterName: `/${this.resourcePrefix}-app/${this.stage}/eks-cluster/kubectl/service-token`,
      stringValue: this.cluster.kubectlProvider?.serviceToken ?? '',
      description: 'Kubectl service token for EKS cluster',
    });

    new ssm.StringParameter(this, 'ClusterKubectlRoleArn', {
      parameterName: `/${this.resourcePrefix}-app/${this.stage}/eks-cluster/kubectl/role-arn`,
      stringValue: this.cluster.kubectlProvider?.role?.roleArn ?? '',
      description: 'Kubectl role ARN for EKS cluster',
    });
  }

  private addIstio() {
    const namespaceName = 'istio-system';
    const namespace = new eks.KubernetesManifest(this, 'IstioNamespace', {
      cluster: this.cluster,
      manifest: [
        {
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: {
            name: namespaceName,
          },
        },
      ],
      overwrite: true,
      prune: true,
    });

    const istioRepo = 'https://istio-release.storage.googleapis.com/charts';
    const istioVersion = '1.26.1';

    const baseChart = this.cluster.addHelmChart('IstioBase', {
      chart: 'base',
      namespace: namespaceName,
      version: istioVersion,
      release: 'istio-base',
      repository: istioRepo,
      wait: true,
      values: {},
    });

    baseChart.node.addDependency(namespace);

    const istiodChart = this.cluster.addHelmChart('IstioIstiod', {
      chart: 'istiod',
      namespace: namespaceName,
      version: istioVersion,
      release: 'istiod',
      repository: istioRepo,
      values: {
        awsRegion: this.region,
      },
    });

    istiodChart.node.addDependency(baseChart);

    const istioCniChart = this.cluster.addHelmChart('IstioCni', {
      chart: 'cni',
      namespace: namespaceName,
      version: istioVersion,
      release: 'cni',
      repository: istioRepo,
      createNamespace: false,
      values: {},
    });

    istioCniChart.node.addDependency(istiodChart);

    const istioGatewayChart = this.cluster.addHelmChart('IstioGateway', {
      chart: 'gateway',
      namespace: namespaceName,
      version: istioVersion,
      release: 'ingressgateway',
      repository: istioRepo,
      values: {
        service: {
          annotations: {
            'service.beta.kubernetes.io/aws-load-balancer-type': 'nlb',
            'service.beta.kubernetes.io/aws-load-balancer-scheme':
              'internet-facing',
            'service.beta.kubernetes.io/aws-load-balancer-subnets': this.vpc
              .selectSubnets({
                subnetType: SubnetType.PUBLIC,
              })
              .subnetIds.join(','),
          },
        },
      },
    });

    istioGatewayChart.node.addDependency(istiodChart);

    return istioGatewayChart;
  }

  private addSecretsStore() {
    const chart = this.cluster.addHelmChart('SecretsStoreCSIDriver', {
      chart: 'secrets-store-csi-driver',
      repository:
        'https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts',
      release: 'secrets-store-csi-driver',
      namespace: 'kube-system',
      version: '1.5.1',
      wait: true,
      timeout: cdk.Duration.minutes(15),
      values: {
        grpcSupportedProviders: 'aws',
        syncSecret: {
          enabled: true,
        },
      },
    });

    const installManifestUrl =
      'https://raw.githubusercontent.com/aws/secrets-store-csi-driver-provider-aws/refs/tags/secrets-store-csi-driver-provider-aws-1.0.1/deployment/aws-provider-installer.yaml';

    const response = (
      request as unknown as (method: HttpVerb, url: string) => Response
    )('GET', installManifestUrl);
    const manifest = yaml.loadAll(response.getBody().toString()) as Record<
      string,
      unknown
    >[];

    const installer = this.cluster.addManifest(
      'SecretsStoreCSIDriverInstaller',
      ...manifest
    );
    installer.node.addDependency(chart);

    return installer;
  }

  private addArgoCD(props: EKSStackProps) {
    const namespace = new eks.KubernetesManifest(this, 'ArgoCDNamespace', {
      cluster: this.cluster,
      manifest: [
        {
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: {
            name: 'argocd',
          },
        },
      ],
      overwrite: true,
      prune: true,
    });

    namespace.node.addDependency(this.istioGateway);

    const serviceAccount = this.cluster.addServiceAccount(
      'ArgoCDServiceAccount',
      {
        name: 'argocd-server',
        namespace: 'argocd',
      }
    );

    serviceAccount.node.addDependency(namespace);

    serviceAccount.role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',
        ],
        resources: [
          `arn:aws:secretsmanager:${this.region}:${this.account}:secret:${props.gitOps.secretName}*`,
        ],
      })
    );

    const secretProviderClassName = 'aws-secrets-provider';

    const secretManifest = this.cluster.addManifest('ArgoCDGitHubToken', {
      apiVersion: 'secrets-store.csi.x-k8s.io/v1',
      kind: 'SecretProviderClass',
      metadata: {
        name: secretProviderClassName,
        namespace: 'argocd',
      },
      spec: {
        provider: 'aws',
        parameters: {
          objects: JSON.stringify([
            {
              objectName: props.gitOps.secretName,
              objectType: AwsSecretType.SECRETSMANAGER,
              jmesPath: [
                { path: 'url', objectAlias: 'url' },
                { path: 'username', objectAlias: 'username' },
                { path: 'password', objectAlias: 'password' },
              ],
            },
          ]),
        },
        secretObjects: [
          {
            secretName: props.gitOps.secretName,
            type: KubernetesSecretType.OPAQUE,
            labels: { 'argocd.argoproj.io/secret-type': 'repo-creds' },
            data: [
              {
                objectName: 'url',
                key: 'url',
              },
              {
                objectName: 'username',
                key: 'username',
              },
              {
                objectName: 'password',
                key: 'password',
              },
            ],
          },
        ],
      },
    });

    secretManifest.node.addDependency(namespace);
    secretManifest.node.addDependency(this.secretsStoreInstaller);

    const chart = this.cluster.addHelmChart('ArgoCDHelm', {
      chart: 'argo-cd',
      release: 'argo-cd-bootstrap',
      namespace: 'argocd',
      repository: 'https://argoproj.github.io/argo-helm',
      version: '8.0.17',
      values: {
        configs: {
          params: {
            'server.insecure': 'true',
            'server.basehref': '/argocd',
            'server.rootpath': '/argocd',
          },
          repositories: {
            [props.gitOps.repoUrl]: {
              url: props.gitOps.repoUrl,
            },
          },
        },
        server: {
          serviceAccount: {
            create: false,
          },
          volumes: [
            {
              name: 'secrets-store-inline',
              csi: {
                driver: 'secrets-store.csi.k8s.io',
                readOnly: true,
                volumeAttributes: {
                  secretProviderClass: secretProviderClassName,
                },
              },
            },
          ],
          volumeMounts: [
            {
              name: 'secrets-store-inline',
              mountPath: '/mnt/secret-store',
            },
          ],
        },
      },
      timeout: cdk.Duration.minutes(15),
    });

    chart.node.addDependency(serviceAccount);
    chart.node.addDependency(secretManifest);

    const rootApp = this.cluster.addManifest('ArgoCDRootApp', {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Application',
      metadata: {
        name: `${this.resourcePrefix}-app-root-app`,
        namespace: 'argocd',
        annotations: {
          'argocd.argoproj.io/sync-wave': '-1',
        },
      },
      spec: {
        destination: {
          namespace: `${this.resourcePrefix}-app`,
          server: 'https://kubernetes.default.svc',
        },
        project: 'default',
        source: {
          directory: {
            recurse: true,
          },
          path: props.gitOps.path,
          repoURL: props.gitOps.repoUrl,
          targetRevision: props.gitOps.targetRevision,
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

    rootApp.node.addDependency(chart);
    rootApp.node.addDependency(this.appNamespace);
  }

  private addVpcCni() {
    const addon = new eks.Addon(this, 'VpcCniAddon', {
      cluster: this.cluster,
      addonName: 'vpc-cni',
      addonVersion: 'v1.19.5-eksbuild.3',
      configurationValues: {
        env: {
          AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG: 'true',
          ENI_CONFIG_LABEL_DEF: 'topology.kubernetes.io/zone',
        },
      },
    });

    this.vpc
      .selectSubnets({
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      })
      .subnets.forEach((subnet) => {
        this.cluster.addManifest(`VpcCni-${subnet.subnetId}`, {
          apiVersion: 'crd.k8s.amazonaws.com/v1alpha1',
          kind: 'ENIConfig',
          metadata: {
            name: subnet.availabilityZone,
          },
          spec: {
            securityGroups: [this.securityGroup.securityGroupId],
            subnet: subnet.subnetId,
          },
        });
      });

    return addon;
  }

  private addEbsCsiDriver() {
    const csiDriverKey = new kms.Key(this, 'CsiDriverKey', {
      alias: `${this.resourcePrefix}-eks-cluster-csi-driver-key-${this.stage}`,
    });

    this.nodeRole.attachInlinePolicy(
      new iam.Policy(this, 'CsiDriverKeyPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['kms:CreateGrant', 'kms:ListGrants', 'kms:RevokeGrant'],
            resources: [csiDriverKey.keyArn],
            conditions: {
              Bool: {
                'kms:GrantIsForAWSResource': 'true',
              },
            },
          }),
          new iam.PolicyStatement({
            actions: [
              'kms:Encrypt',
              'kms:Decrypt',
              'kms:ReEncrypt*',
              'kms:GenerateDataKey*',
              'kms:DescribeKey',
              'kms:GenerateDataKeyWithoutPlaintext',
            ],
            resources: [csiDriverKey.keyArn],
          }),
        ],
      })
    );

    const addon = new eks.Addon(this, 'EbsCsiDriverAddon', {
      cluster: this.cluster,
      addonName: 'aws-ebs-csi-driver',
      addonVersion: 'v1.44.0-eksbuild.1',
    });

    const patchSc = new eks.KubernetesPatch(this, 'RemoveGP2StorageClass', {
      cluster: this.cluster,
      resourceName: 'storageclass/gp2',
      applyPatch: {
        metadata: {
          annotations: {
            'storageclass.kubernetes.io/is-default-class': 'false',
          },
        },
      },
      restorePatch: {
        metadata: {
          annotations: {
            'storageclass.kubernetes.io/is-default-class': 'true',
          },
        },
      },
    });

    const updateSc = new eks.KubernetesManifest(this, 'UpdateGP3StorageClass', {
      cluster: this.cluster,
      manifest: [
        {
          apiVersion: 'storage.k8s.io/v1',
          kind: 'StorageClass',
          metadata: {
            name: 'gp3',
            annotations: {
              'storageclass.kubernetes.io/is-default-class': 'true',
            },
          },
          provisioner: 'ebs.csi.aws.com',
          reclaimPolicy: 'Delete',
          volumeBindingMode: 'WaitForFirstConsumer',
          parameters: {
            type: 'gp3',
            fsType: 'ext4',
            encrypted: 'true',
          },
        },
      ],
    });

    patchSc.node.addDependency(addon);
    updateSc.node.addDependency(patchSc);

    return addon;
  }
}
