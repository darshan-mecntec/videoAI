export interface BaseEvent {
  event_name: string;
  version: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface ProviderCallSucceededEvent extends BaseEvent {
  event_name: 'provider.call.succeeded';
  version: 'v1';
  payload: {
    call_id: string;
    provider_id: string;
    capability: string;
    latency_ms: number;
    cost_usd: number;
  };
}

export interface ProviderCallFailedEvent extends BaseEvent {
  event_name: 'provider.call.failed';
  version: 'v1';
  payload: {
    call_id: string;
    provider_id: string;
    capability: string;
    error_code: string;
    attempt_number: number;
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
