const gitOwner = 'vm-x-ai';
const gitRepo = 'vm-x-ai-file-classifier';

export type GitOps =
  | {
      enabled: true;
      owner: string;
      repo: string;
      repoUrl: string;
      secretName: string;
      targetRevision: string;
    }
  | {
      enabled: false;
    };

const gitOps: GitOps = {
  enabled: true,
  owner: gitOwner,
  repo: gitRepo,
  repoUrl: `https://github.com/${gitOwner}/${gitRepo}`,
  secretName: 'argocd-github-token',
  targetRevision: 'main',
};

export const stages = [
  {
    accountId: '000000000000',
    stageName: 'local',
    adminRoleArn:
      'arn:aws:iam::XXXXXXXXXXXX:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AWSAdministratorAccess_xxxxxx',
    region: 'us-east-1',
    isProd: false,
    cidr: '10.0.0.0/16',
    gitOps: {
      ...gitOps,
      path: `packages/infra/argocd/local`,
    },
  },
  {
    accountId: '905418372997', // NOTE: Replace with your dev account ID
    stageName: 'dev',
    /**
     * NOTE: Replace with your Admin role ARN
     *
     * This will be granted role to access the EKS cluster.
     */
    adminRoleArn:
      'arn:aws:iam::905418372997:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AWSAdministratorAccess_ee10c8d485cb1dd8',
    region: 'us-east-1',
    isProd: false,
    cidr: '10.0.0.0/16',
    gitOps: {
      ...gitOps,
      path: `packages/infra/argocd/dev`,
    },
  },
  {
    accountId: '339712832878', // NOTE: Replace with your shared services account ID
    stageName: 'shared',
    region: 'us-east-1',
    isProd: false,
    cidr: '10.2.0.0/16',
    gitOps: {
      ...gitOps,
      path: `packages/infra/argocd/shared`,
    },
  },
];

export const getStages = (env?: string) => {
  if (env) {
    return stages.filter((stage) => stage.stageName === env);
  }
  return stages;
};
