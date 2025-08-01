import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import { RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';

interface DatabaseStackProps extends cdk.StackProps {
  stage: string;
  instanceType: ec2.InstanceType;
}

export class DatabaseStack extends cdk.Stack {
  private readonly resourcePrefix: string = RESOURCE_PREFIX;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcName: `${this.resourcePrefix}-app-vpc-${props.stage}`,
    });

    const securityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for the database',
      securityGroupName: `${this.resourcePrefix}-app-database-security-group-${props.stage}`,
    });

    const encryptionKey = new kms.Key(this, 'DatabaseKey', {
      alias: `${this.resourcePrefix}-app-database-key-${props.stage}`,
    });

    const databaseSecret = new rds.DatabaseSecret(this, 'DatabaseSecret', {
      username: 'postgres_admin',
      dbname: 'app',
      encryptionKey,
      secretName: `${this.resourcePrefix}-app-database-secret-${props.stage}`,
      // Same as default, but adding the `,` character to the exclude list
      excludeCharacters: ' ,%+~`#$&*()|[]{}:;<>?!\'/@"\\',
    });

    const subnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      description: 'Subnet group for the database',
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      subnetGroupName: `${this.resourcePrefix}-app-database-subnet-group-${props.stage}`,
    });

    const databaseCluster = new rds.DatabaseCluster(this, 'AppDatabase', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_17_4,
      }),
      writer: rds.ClusterInstance.provisioned('Writer1', {
        autoMinorVersionUpgrade: true,
        instanceIdentifier: `${this.resourcePrefix}-app-database-writer1-${props.stage}`,
        publiclyAccessible: false,
        instanceType: props.instanceType,
      }),
      autoMinorVersionUpgrade: true,
      securityGroups: [securityGroup],
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      clusterIdentifier: `${this.resourcePrefix}-app-database-${props.stage}`,
      credentials: rds.Credentials.fromSecret(databaseSecret),
      backup: {
        retention: cdk.Duration.days(30),
      },
      storageEncrypted: true,
      storageEncryptionKey: encryptionKey,
      defaultDatabaseName: 'app',
      enablePerformanceInsights: true,
      iamAuthentication: true,
      performanceInsightEncryptionKey: encryptionKey,
      subnetGroup,
      cloudwatchLogsExports: ['postgresql'],
      instanceIdentifierBase: `${this.resourcePrefix}-app-database-instance-${props.stage}`,
    });

    const eksSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'EksSecurityGroup',
      ssm.StringParameter.fromStringParameterName(
        this,
        'EksSecurityGroupParameter',
        `/${this.resourcePrefix}-app/${props.stage}/eks-cluster/security-group-id`
      ).stringValue
    );

    const bastionHostSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'BastionHostSecurityGroup',
      ssm.StringParameter.fromStringParameterName(
        this,
        'BastionHostSecurityGroupParameter',
        `/${this.resourcePrefix}-app/${props.stage}/bastion-host/security-group-id`
      ).stringValue
    );

    databaseCluster.connections.allowDefaultPortFrom(eksSecurityGroup);
    databaseCluster.connections.allowDefaultPortFrom(bastionHostSecurityGroup);

    new ssm.StringParameter(this, 'DatabaseEndpoint', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/database/endpoint`,
      stringValue: databaseCluster.clusterEndpoint.hostname,
    });

    new ssm.StringParameter(this, 'DatabaseRoEndpoint', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/database/ro-endpoint`,
      stringValue: databaseCluster.clusterReadEndpoint.hostname,
    });

    new ssm.StringParameter(this, 'DatabasePort', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/database/port`,
      stringValue: databaseCluster.clusterEndpoint.port.toString(),
    });

    new ssm.StringParameter(this, 'DatabaseSecretKmsKeyArn', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/database/secret/kms-key/arn`,
      stringValue: encryptionKey.keyArn,
    });

    new ssm.StringParameter(this, 'DatabaseSecurityGroupId', {
      parameterName: `/${this.resourcePrefix}-app/${props.stage}/database/security-group-id`,
      stringValue: securityGroup.securityGroupId,
    });
  }
}
