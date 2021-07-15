import {
  ConsumerConfig,
  KafkaConfig,
  ProducerConfig,
  ConsumerRunConfig,
} from 'kafkajs';
import { SchemaRegistryAPIClientArgs } from '@kafkajs/confluent-schema-registry/dist/api';
import { SchemaRegistryAPIClientOptions } from '@kafkajs/confluent-schema-registry/dist/@types';

export interface IKafkaModuleSchemaRegistryConfiguration {
  api: SchemaRegistryAPIClientArgs;
  options?: SchemaRegistryAPIClientOptions;
}

export interface IKafkaModuleConfiguration {
  client: KafkaConfig;
  consumer?: ConsumerConfig;
  consumerRun?: ConsumerRunConfig;
  producer?: ProducerConfig;
  schemaRegistry: IKafkaModuleSchemaRegistryConfiguration;
}
