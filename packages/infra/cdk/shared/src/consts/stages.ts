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
  targetRevision: 'temporal-workflow',
};

export const stages = [
  {
    accountId: '000000000000',
    stageName: 'local',
    rootDomainName: 'localhost',
    apiRootDomainName: 'localhost',
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
    accountId: '[YOUR_DEV_ACCOUNT_ID]',
    stageName: 'dev',
    rootDomainName: 'dev.xxxxxx.com',
    apiRootDomainName: 'api.dev.xxxxxx.com',
    adminRoleArn:
      'arn:aws:iam::[YOUR_DEV_ACCOUNT_ID]:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AdministratorAccess_xxxxxx',
    region: 'us-east-1',
    isProd: false,
    cidr: '10.0.0.0/16',
    gitOps: {
      ...gitOps,
      path: `packages/infra/argocd/dev`,
    },
  },
  {
    accountId: '[YOUR_SHARED_SERVICES_ACCOUNT_ID]',
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
