import { Injectable } from '@nestjs/common';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { KafkaLogger } from '../loggers';
import { IKafkaModuleSchemaRegistryConfiguration } from '../interfaces';
import {
  getSchemaRegistryKeySubjectByTopic,
  getSchemaRegistryValueSubjectByTopic,
} from '../helpers/topic-subject.helper';
import { EmitKafkaEventPayload } from '../interfaces';
import { Message } from 'kafkajs';

@Injectable()
export class KafkaAvroSerializer {
  private schemaRegistry: SchemaRegistry;
  protected schemas: Map<string, { keyId: number | null; valueId: number }> =
    new Map();

  constructor(private readonly kafkaLogger: KafkaLogger) {}

  /**
   * Initialize
   * @param configuration
   * @param topics
   */
  async initialize(
    configuration: IKafkaModuleSchemaRegistryConfiguration,
    topics: string[],
  ): Promise<void> {
    this.schemaRegistry = new SchemaRegistry(
      configuration.api,
      configuration?.options,
    );
    await this.fetchAllSchemaIds(topics);
  }

  /**
   * Fetch all schemas initially
   * @param topics
   * @private
   */
  private async fetchAllSchemaIds(topics: string[]): Promise<void> {
    for await (const topic of topics) {
      await this.fetchSchemaIds(topic);
    }
  }

  /**
   * Fetch a single schema by topic and store in internal schema map
   * @param topic
   * @private
   */
  private async fetchSchemaIds(topic: string): Promise<void> {
    try {
      const keyId =
        (await this.schemaRegistry.getLatestSchemaId(
          getSchemaRegistryKeySubjectByTopic(topic),
        )) || null;
      const valueId = await this.schemaRegistry.getLatestSchemaId(
        getSchemaRegistryValueSubjectByTopic(topic),
      );
      this.schemas.set(topic, {
        keyId,
        valueId,
      });
    } catch (reject) {
      this.kafkaLogger.error(
        `Error while fetching schema ids for topic ${topic}`,
        reject,
      );
      throw reject;
    }
  }

  /**
   * Serialize given payload to be compliant with KafkaJS
   * @param value
   */
  async serialize<V, K>(
    value: EmitKafkaEventPayload<V, K> & Omit<Message, 'key' | 'value'>,
  ): Promise<Message | undefined> {
    const ids = this.schemas.get(value.topic);
    if (!ids) {
      this.kafkaLogger.error(
        `Trying to serialize message in topic ${value.topic} failed: No schema ids found.`,
      );
      return undefined;
    }
    try {
      const message: Message = {
        value: await this.schemaRegistry.encode(ids.valueId, value.event),
        partition: value?.partition,
        headers: value?.headers,
        timestamp: value?.timestamp,
      };
      if (ids?.keyId) {
        message['key'] = await this.schemaRegistry.encode(ids.keyId, value.key);
      } else {
        // fail-safe...
        if (value.key && typeof value.key === 'string') {
          message['key'] = value.key;
        }
      }
      return message;
    } catch (reject) {
      this.kafkaLogger.error(
        `Error while serializing message: ${JSON.stringify(value)}`,
        reject,
      );
      throw reject;
    }
  }
}
