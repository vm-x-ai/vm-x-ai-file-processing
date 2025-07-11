import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import {
  BaseStack,
  BaseStackProps,
  importEksCluster,
} from '@workspace/infra-cdk-shared';

export class EvaluationWorkflowStack extends BaseStack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
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

      this.registerArgoCDApplication(
        eksCluster,
        props,
        'evaluation-workflow-sqs-consumer',
        `${this.resourcePrefix}-app`
      );

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
