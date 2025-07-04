# EKS Cluster Infrastructure

This package demonstrates how to provision a secure, production-ready Amazon EKS (Elastic Kubernetes Service) cluster using AWS CDK and Nx. It includes supporting IAM roles, security groups, encryption, and integrations for running cloud-native workloads at scale.

## EKS Auto Mode

EKS Auto Mode is enabled by default in this stack. Auto Mode allows AWS to manage the underlying infrastructure for your Kubernetes cluster, including compute, networking, and storage. This greatly reduces operational overhead and ensures your cluster is always up-to-date, secure, and cost-optimized.

### What is EKS Auto Mode?

- **Automated Compute:** Nodes are automatically created and scaled based on workload demand, using Karpenter for efficient autoscaling. Idle nodes are terminated to save costs.
- **Automated Networking:** Load balancers (ALB/NLB) are provisioned and managed automatically for your Kubernetes Services and Ingress resources, following AWS best practices.
- **Automated Storage:** EBS volumes and storage classes are managed for you, including encryption and lifecycle policies.
- **Security:** Nodes use immutable AMIs, SELinux, and read-only root filesystems. Nodes are regularly recycled (max 21 days) for security and patching.
- **Upgrades:** Cluster and node upgrades are automated, respecting Pod Disruption Budgets and NodePool Disruption Budgets.
- **Add-ons:** Core add-ons like CNI, EBS CSI, DNS, and GPU support are managed as part of the cluster, not as separate add-ons.

### Customizing EKS Auto Mode

While Auto Mode manages most infrastructure, you can customize your cluster by:

- **Node Pools:** Add custom NodePools for specific instance types, architectures, or capacity types (On-Demand, Spot). You can also set taints, labels, and scaling limits.
- **Networking:** Customize subnet placement, security groups, and network policies.
- **Storage:** Define custom storage classes, encryption keys, and volume parameters.
- **Load Balancing:** Configure ALB/NLB settings via Kubernetes annotations and IngressClass resources.
- **Disabling Defaults:** You can disable the default node pools and create your own for advanced scenarios.

For more, see the [AWS EKS Auto Mode documentation](https://docs.aws.amazon.com/eks/latest/userguide/automode.html).

## Architecture Overview

- **Cluster Provisioning:**
  - Provisions an Amazon EKS cluster in a VPC, with private subnets for worker nodes.
  - Configures IAM roles for cluster administration, nodes, and service accounts.
  - Enables encryption for secrets using a dedicated KMS key.
  - Supports multi-stage deployments (dev, prod, etc.).
- **Node Groups & Launch Templates:**
  - Uses custom EC2 launch templates for node groups.
  - Tags resources for stage, cluster, and node group identification.
- **Kubernetes Add-ons & Integrations:**
  - Installs and configures Istio (service mesh) via Helm charts, including base, control plane, CNI, and ingress gateway.
  - Installs the Secrets Store CSI Driver and AWS provider for secure secret injection from AWS Secrets Manager and SSM.
  - Installs ArgoCD for GitOps-based application delivery.
  - Installs VPC CNI and EBS CSI drivers for networking and storage.
- **Resource Discovery & Outputs:**
  - Stores key resource identifiers (security group IDs, OIDC provider ARN, kubectl service token, etc.) in SSM Parameter Store for use by other stacks and automation.

## Key Benefits

- Production-grade, secure, and extensible Kubernetes platform.
- Automated installation of essential add-ons for service mesh, GitOps, and secret management.
- Designed for multi-account, multi-stage, and cross-team cloud-native development.
- Minimal operational overhead thanks to EKS Auto Mode.

## Usage

This example is intended for learning and as a template for your own infrastructure projects. It is not meant to be imported as a runtime dependency.

### Build

```bash
pnpm nx build infra-eks
```

### Deploy

```bash
pnpm nx run infra-eks:cdk-deploy
```

## Project Structure

- `src/main.ts`: CDK app entry point, deploys the EKS stack for each stage
- `src/stacks/eks-stack.ts`: Defines the EKS cluster, add-ons, and supporting resources

## Requirements

- AWS credentials and permissions to deploy infrastructure
- Nx and pnpm installed
- Node.js (see repository root for version)
