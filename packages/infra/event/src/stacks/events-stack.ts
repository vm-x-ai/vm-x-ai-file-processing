import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import { RESOURCE_PREFIX } from '@workspace/infra-cdk-shared';

export interface EventsStackProps extends cdk.StackProps {
  stage: string;
}

export class EventsStack extends cdk.Stack {
  private readonly resourcePrefix: string = RESOURCE_PREFIX;

  constructor(scope: Construct, id: string, props: EventsStackProps) {
    super(scope, id, props);

    new events.EventBus(this, 'EventBus', {
      eventBusName: `${this.resourcePrefix}-event-bus-${props.stage}`,
    });
  }
}
