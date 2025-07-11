import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import {
  GitOps,
  importEksCluster,
  RESOURCE_PREFIX,
} from '@workspace/infra-cdk-shared';

export interface EvaluationWorkflowStackProps extends cdk.StackProps {
  stage: string;
  sharedServicesAccountId: string;
  gitOps: GitOps & {
    path: string;
  };
}

export class EvaluationWorkflowStack extends cdk.Stack {
  private readonly resourcePrefix: string = RESOURCE_PREFIX;

  constructor(
    scope: Construct,
    id: string,
    props: EvaluationWorkflowStackProps
  ) {
    super(scope, id, props);

    const eventBus = events.EventBus.fromEventBusName(
      this,
      'EventBus',
      `${this.resourcePrefix}-event-bus-${props.stage}`
    );

    const evaluationQueue = new sqs.Queue(this, 'EvaluationWorkflowQueue', {
      queueName: `${this.resourcePrefix}-evaluation-workflow-${this.region}-${props.stage}`,
    });

    new events.Rule(this, 'EvaluationWorkflowTriggerRule', {
      eventBus,
      eventPattern: {
        detailType: ['file_ingested_successfully'],
      },
      ruleName: `${this.resourcePrefix}-evaluation-workflow-${this.region}-${props.stage}`,
      targets: [
        new targets.SqsQueue(evaluationQueue, {
          message: events.RuleTargetInput.fromEventPath('$.detail'),
        }),
      ],
    });

    if (props.stage !== 'local') {
      const eksCluster = importEksCluster(
        this,
        'EKSCluster',
        props.stage,
        this.resourcePrefix
      );

      eksCluster.addManifest('ArgoCDApp', {
        apiVersion: 'argoproj.io/v1alpha1',
        kind: 'Application',
        metadata: {
          name: `${this.resourcePrefix}-app-evaluation-workflow`,
          namespace: 'argocd',
        },
        spec: {
          destination: {
            namespace: `${this.resourcePrefix}-app`,
            server: 'https://kubernetes.default.svc',
          },
          project: 'default',
          source: {
            path: props.gitOps.path,
            repoURL: props.gitOps.repoUrl,
            targetRevision: props.gitOps.targetRevision,
            helm: {
              valueFiles: [`${props.stage}.values.yaml`],
              values: {
                sharedServicesAccountId: props.sharedServicesAccountId,
                resourcePrefix: this.resourcePrefix,
                stage: props.stage,
                awsRegion: this.region,
                awsAccountId: this.account,
              },
            },
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

      const serviceAccount = eksCluster.addServiceAccount(
        'EksEvaluationWorkflowServiceAccount',
        {
          name: `${this.resourcePrefix}-evaluation-workflow-service-account`,
          namespace: `${this.resourcePrefix}-app`,
        }
      );

      evaluationQueue.grantConsumeMessages(serviceAccount.role);
    }
  }
}
