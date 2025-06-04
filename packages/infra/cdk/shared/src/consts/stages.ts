export const stages = [
  {
    accountId: '000000000000',
    stageName: 'local',
    rootDomainName: 'TBC',
    apiRootDomainName: 'TBC',
    region: 'us-east-1',
    isProd: false,
    cidr: '10.1.0.0/16'
  },
  {
    accountId: '978398161683',
    stageName: 'dev',
    rootDomainName: 'TBC',
    apiRootDomainName: 'TBC',
    region: 'us-east-1',
    isProd: false,
    cidr: '10.0.0.0/16'
  }
];

export const getStages = (env?: string) => {
  if (env) {
    return stages.filter((stage) => stage.stageName === env);
  }
  return stages;
};
