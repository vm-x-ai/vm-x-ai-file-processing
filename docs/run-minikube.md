# Deploy to Locally to Minikube

You can also deploy the entire stack to your local Minikube cluster, this is useful for development and testing purposes.

## Requirements

- [Bootstrap Workspace](./run-locally.md)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [Helm](https://helm.sh/docs/intro/install/)

## System Requirements

- The K8S cluster is configured with 8 CPU cores and 16GB of memory, so, make sure you have enough resources to run the stack.

## Getting Started

Run the following command to bootstrap the workspace:

```bash
pnpm run minikube-bootstrap
```

This will:

- Start Minikube
- Install Istio
- Install Temporal
- Install LocalStack
- Install PostgreSQL
- Build the Docker images
- Deploy the stack to Minikube

## Accessing Minikube Dashboard

```bash
minikube dashboard
```

## Accessing the stack

- Temporal UI: http://localhost/temporal
- API OpenAI Docs: http://localhost/api/docs
- UI: http://localhost/ui
- API: http://localhost/api

Before interacting with the UI, make sure you have the ngrok tunnel, minikube tunnel and localstack port-forwarding running.

- ngrok http --url=http://${NGROK_DOMAIN} 80
- minikube tunnel
- kubectl port-forward svc/localstack 4566:4566 -n localstack

or just run:

```bash
pnpm run minikube-serve
```
