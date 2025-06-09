import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export interface EvaluationWorkflowStackProps extends cdk.StackProps {
  stage: string;
  triggerUrls: string[];
}

export class EvaluationWorkflowStack extends cdk.Stack {
  public readonly workflowTriggerTopic: sns.Topic;

  constructor(
    scope: Construct,
    id: string,
    props: EvaluationWorkflowStackProps
  ) {
    super(scope, id, props);

    this.workflowTriggerTopic = new sns.Topic(
      this,
      'EvaluationWorkflowTriggerTopic',
      {
        topicName: `vm-x-ai-evaluation-workflow-trigger-${this.region}-${props.stage}`,
      }
    );

    for (const triggerUrl of props.triggerUrls) {
      new sns.Subscription(
        this,
        `EvaluationWorkflowTriggerSubscription-${triggerUrl}`,
        {
          endpoint: triggerUrl,
          protocol: triggerUrl.startsWith('https://')
            ? sns.SubscriptionProtocol.HTTPS
            : sns.SubscriptionProtocol.HTTP,
          topic: this.workflowTriggerTopic,
        }
      );
    }

    const eventBus = events.EventBus.fromEventBusName(
      this,
      'EventBus',
      `dm-event-bus-${props.stage}`
    );

    new events.Rule(this, 'EvaluationWorkflowTriggerRule', {
      eventBus,
      eventPattern: {
        detailType: ['file_ingested_successfully'],
      },
      ruleName: `vm-x-ai-evaluation-workflow-trigger-${props.stage}`,
      targets: [
        new targets.SnsTopic(this.workflowTriggerTopic, {
          message: events.RuleTargetInput.fromEventPath('$.detail'),
        }),
      ],
    });
  }
}
