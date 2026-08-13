export interface BaseEvent {
  event_name: string;
  version: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface ProviderConfigUpdatedEvent extends BaseEvent {
  event_name: 'provider.config.updated';
  version: 'v1';
  payload: {
    provider_id: string;
    slug: string;
    status: string;
    capabilities: string[];
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
