import { SetMetadata } from '@nestjs/common';
import { KafkaEventEmitterFunction } from '../interfaces/kafka-event.interface';

export type KafkaEventEmitterMetadata = {
  topics: string | string[];
  target: any;
  methodName: string | symbol;
  callback: KafkaEventEmitterFunction;
};

export const KAFKA_EVENT_EMITTER = 'KAFKA_EVENT_EMITTER';

export const EventEmitter = (topics: string | string[]): MethodDecorator => {
  return <T = () => Promise<void>>(target, propertyKey, descriptor) => {
    SetMetadata<string, KafkaEventEmitterMetadata>(KAFKA_EVENT_EMITTER, {
      topics,
      target: target.constructor.name,
      methodName: propertyKey,
      callback: descriptor.value,
    })(target, propertyKey, descriptor);
  };
};
