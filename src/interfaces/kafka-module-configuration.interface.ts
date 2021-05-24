import {
  ConsumerConfig,
  KafkaConfig,
  ProducerConfig,
  ProducerRecord,
  Message,
  ConsumerRunConfig,
} from 'kafkajs';

export interface IKafkaModuleConfiguration {
  client: KafkaConfig;
  consumer: ConsumerConfig;
  consumerRunConfig?: ConsumerRunConfig;
  producer?: ProducerConfig;
  //deserializer?: Deserializer;
  //serializer?: Serializer;
  consumeFromBeginning?: boolean;
  seek?: Record<string, number | 'earliest'>;
  autoConnect?: boolean;
}
