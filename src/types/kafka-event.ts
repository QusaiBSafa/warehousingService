/**
 * Wrapper for Kafka events
 * @author Qusai Safa
 */
export class KafkaEvent {
  producerUserId: number;

  eventName: string;

  eventType: string;

  eventTime: Date;

  eventSource: string;

  details?: any;
}
