import { RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';
import * as cdk from 'aws-cdk-lib';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import {
  BastionHostLinux,
  IpAddresses,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

interface NetworkStackProps extends cdk.StackProps {
  stage: string;
  cidr: string;
}

export class NetworkStack extends cdk.Stack {
  vpc: IVpc;
  private readonly resourcePrefix: string = RESOURCE_PREFIX;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    this.vpc = new Vpc(this, 'Vpc', {
      vpcName: `${this.resourcePrefix}-app-vpc-${props.stage}`,
      ipAddresses: IpAddresses.cidr(props.cidr),
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 1,
      maxAzs: 3,
      subnetConfiguration: [
        {
          name: 'private-subnet-1',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'public-subnet-1',
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'isolated-subnet-1',
          subnetType: SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const bastionHostSecurityGroup = new SecurityGroup(
      this,
      'BastionHostSecurityGroup',
      {
        vpc: this.vpc,
        securityGroupName: `${this.resourcePrefix}-app-bastion-host-security-group-${props.stage}`,
      }
    );

    const bastionHost = new BastionHostLinux(this, 'BastionHost', {
      vpc: this.vpc,
      instanceName: `${this.resourcePrefix}-app-bastion-host-${props.stage}`,
      securityGroup: bastionHostSecurityGroup,
      subnetSelection: {
        subnetType: SubnetType.PUBLIC,
      },
    });

    new StringParameter(this, 'BastionHostInstanceId', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/bastion-host/instance-id`,
      stringValue: bastionHost.instanceId,
    });

    new StringParameter(this, 'BastionHostSecurityGroupId', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/bastion-host/security-group-id`,
      stringValue: bastionHostSecurityGroup.securityGroupId,
    });
  }
}
