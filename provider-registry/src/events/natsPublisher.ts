import { connect, NatsConnection, StringCodec } from 'nats';
import { EventPublisher, BaseEvent } from './publisher';

export class NatsEventPublisher implements EventPublisher {
  private nc: NatsConnection | null = null;
  private sc = StringCodec();
  private isConnected: boolean = false;

  constructor(
    private url: string = "nats://localhost:4222",
    private subjectPrefix: string = "provider"
  ) {}

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        this.nc = await connect({ servers: this.url });
        this.isConnected = true;
        console.log("Connected to NATS");
      } catch (error) {
        console.error("Failed to connect to NATS:", error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.nc) {
      try {
        await this.nc.close();
        this.isConnected = false;
        console.log("Disconnected from NATS");
      } catch (error) {
        console.error("Error disconnecting from NATS:", error);
      }
    }
  }

  async publish(event: BaseEvent): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    if (!this.nc) {
      throw new Error("NATS connection not initialized");
    }

    try {
      const subject = `${this.subjectPrefix}.${event.event_name}.${event.version}`;
      const payload = JSON.stringify(event);
      this.nc.publish(subject, this.sc.encode(payload));
      console.log(`Published event to ${subject}:`, event.event_name);
    } catch (error) {
      console.error(`Failed to publish event ${event.event_name}:`, error);
      // Don't throw - we don't want to break the main flow if event publishing fails
    }
  }

  getConnection(): NatsConnection | null {
    return this.nc;
  }
}
