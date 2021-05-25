/**
 * Kafka Event. Per default, the key schema is in form of
 * e.g. {id: string} and not a plain string.
 */
export interface IKafkaEvent<
  V = Record<string, unknown>,
  K = Record<string, unknown>,
> {
  event: V;
  key: K;
  arrival: Date;
}

/**
 * Event handler function
 */
export type KafkaEventHandlerFunction = (event: IKafkaEvent) => Promise<void>;

/**
 * Event emitter function
 */
export type KafkaEventEmitterFunction = () => Promise<void>;

/**
 * Payload for emitting Kafka-related events
 */
export type EmitKafkaEventPayload = {
  topic: string;
  event: IKafkaEvent['event'];
  key: IKafkaEvent['key'];
};
