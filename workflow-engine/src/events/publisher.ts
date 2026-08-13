export interface BaseEvent {
  event_name: string;
  version: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface WorkflowRunStartedEvent extends BaseEvent {
  event_name: 'workflow.run.started';
  version: 'v1';
  payload: {
    run_id: string;
    workflow_id: string;
    user_id: string;
    started_at: string;
  };
}

export interface WorkflowStepCompletedEvent extends BaseEvent {
  event_name: 'workflow.step.completed';
  version: 'v1';
  payload: {
    run_id: string;
    step_id: string;
    output_ref: Record<string, unknown>;
  };
}

export interface WorkflowRunCompletedEvent extends BaseEvent {
  event_name: 'workflow.run.completed';
  version: 'v1';
  payload: {
    run_id: string;
    workflow_id: string;
    status: string;
    outputs: Record<string, unknown>;
  };
}

export interface EventPublisher {
  publish(event: BaseEvent): Promise<void>;
}

export class InMemoryEventBus implements EventPublisher {
  public publishedEvents: BaseEvent[] = [];

  async publish(event: BaseEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  clear(): void {
    this.publishedEvents = [];
  }
}
