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
  },
  {
    accountId: 'XXXXXXXXXXXX',
    stageName: 'dev',
    rootDomainName: 'dev.xxxxxx.com',
    apiRootDomainName: 'api.dev.xxxxxx.com',
    adminRoleArn:
      'arn:aws:iam::XXXXXXXXXXXX:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AWSAdministratorAccess_xxxxxx',
    region: 'us-east-1',
    isProd: false,
    cidr: '10.0.0.0/16',
  },
  {
    accountId: 'XXXXXXXXXXXX',
    stageName: 'prd',
    rootDomainName: 'xxxxxx.com',
    apiRootDomainName: 'api.xxxxxx.com',
    adminRoleArn:
      'arn:aws:iam::XXXXXXXXXXXX:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AWSAdministratorAccess_xxxxxx',
    region: 'us-east-1',
    isProd: true,
    cidr: '10.1.0.0/16',
  },
  {
    accountId: 'XXXXXXXXXXXX',
    stageName: 'shared',
    region: 'us-east-1',
    isProd: false,
    cidr: '10.2.0.0/16',
  },
];

export const getStages = (env?: string) => {
  if (env) {
    return stages.filter((stage) => stage.stageName === env);
  }
  return stages;
};
