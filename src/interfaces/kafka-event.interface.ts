export interface IKafkaEvent<
  V = Record<string, unknown>,
  K = Record<string, unknown>,
> {
  value: V;
  key: K;
  offset: number;
  arrival: Date;
}

export type KafkaEventHandlerFunction = (event: IKafkaEvent) => Promise<void>;
