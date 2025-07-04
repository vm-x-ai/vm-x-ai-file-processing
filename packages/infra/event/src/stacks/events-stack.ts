import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';

export interface EventsStackProps extends cdk.StackProps {
  stage: string;
}

export class EventsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EventsStackProps) {
    super(scope, id, props);

    new events.EventBus(this, 'EventBus', {
      eventBusName: `vmxfp-event-bus-${props.stage}`,
    });
  }
}
