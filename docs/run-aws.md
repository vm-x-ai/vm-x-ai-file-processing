# Deploy to AWS

You can also deploy this entire stack to your AWS account.

**IMPORTANT:** Be aware that will cost money since it creates, RDS, EKS and EC2 instances.

## AWS Account Setup

This project requires two AWS accounts:

1. **Shared Services Account**: Contains shared resources like ECR repositories.
2. **Development Account**: Contains the application infrastructure like EKS cluster, RDS database, and application workloads.

TBC: Add a easy way to replace the resource prefix in the codebase without massive changes.

## Update the AWS Account IDs

Update the `packages/infra/cdk/shared/src/consts/stages.ts` with your AWS accounts information.

TODO TO UPDATE: `nx.json`

## Aurora Database Tunnel

Export the AWS profile:

```bash
export AWS_PROFILE=<your-profile>
```

Start the SSM session from the bastion host to the database:

```bash
aws ssm start-session \
--target $(aws ssm get-parameter --name /[YOUR_RESOURCE_PREFIX]-app/dev/bastion-host/instance-id --query 'Parameter.Value' --output text) \
--document-name AWS-StartPortForwardingSessionToRemoteHost \
--parameters "{
  \"host\": [\"$(aws ssm get-parameter --name /[YOUR_RESOURCE_PREFIX]-app/dev/database/endpoint --query 'Parameter.Value' --output text)\"],
  \"portNumber\": [\"$(aws ssm get-parameter --name /[YOUR_RESOURCE_PREFIX]-app/dev/database/port --query 'Parameter.Value' --output text)\"],
  \"localPortNumber\": [\"5433\"]
}"
```

## ECR

Docker Login:

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [SHARED_SERVICES_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com
```
