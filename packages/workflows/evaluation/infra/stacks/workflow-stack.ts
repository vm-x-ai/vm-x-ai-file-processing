import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { importEksCluster } from '@vmxfp/infra-cdk-shared';

export interface EvaluationWorkflowStackProps extends cdk.StackProps {
  stage: string;
}

export class EvaluationWorkflowStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: EvaluationWorkflowStackProps
  ) {
    super(scope, id, props);

    const eventBus = events.EventBus.fromEventBusName(
      this,
      'EventBus',
      `vmxfp-event-bus-${props.stage}`
    );

    const evaluationQueue = new sqs.Queue(this, 'EvaluationWorkflowQueue', {
      queueName: `vmxfp-evaluation-workflow-${this.region}-${props.stage}`,
    });

    new events.Rule(this, 'EvaluationWorkflowTriggerRule', {
      eventBus,
      eventPattern: {
        detailType: ['file_ingested_successfully'],
      },
      ruleName: `vmxfp-evaluation-workflow-${this.region}-${props.stage}`,
      targets: [
        new targets.SqsQueue(evaluationQueue, {
          message: events.RuleTargetInput.fromEventPath('$.detail'),
        }),
      ],
    });

    if (props.stage !== 'local') {
      const eksCluster = importEksCluster(this, 'EKSCluster', props.stage);

      const serviceAccount = eksCluster.addServiceAccount(
        'EksEvaluationWorkflowServiceAccount',
        {
          name: 'vmxfp-evaluation-workflow-service-account',
          namespace: 'vmxfp-app',
        }
      );

      evaluationQueue.grantConsumeMessages(serviceAccount.role);
    }
  }
}
