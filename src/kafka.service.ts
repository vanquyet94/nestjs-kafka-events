import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { KafkaEventHandlerService } from './kafka-event-handler.service';
import { KafkaModuleConfigurationProvider } from './providers';
import { retry } from './helpers/retry.util';
import { KafkaLogger } from './loggers';
import {
  Consumer,
  Kafka,
  Producer,
  Admin,
  SeekEntry,
  TopicMessages,
} from 'kafkajs';
import { KafkaAvroSerializer } from './serializer';
import { KafkaAvroDeserializer } from './deserializer';
import { IKafkaModuleConfiguration } from './interfaces';
import { EmitKafkaEventPayload } from './interfaces/kafka-event.interface';
import { getSchemaRegistryValueSubjectByTopic } from './helpers/topic-subject.helper';

@Injectable()
export class KafkaService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private admin: Admin;
  private config: IKafkaModuleConfiguration;
  protected topicOffsets: Map<
    string,
    (SeekEntry & { high: string; low: string })[]
  > = new Map();

  constructor(
    private readonly kafkaModuleConfigurationProvider: KafkaModuleConfigurationProvider,
    private readonly kafkaEventHandlerService: KafkaEventHandlerService,
    private readonly kafkaLogger: KafkaLogger,
    private readonly kafkaAvroSerializer: KafkaAvroSerializer,
    private readonly kafkaAvroDeserializer: KafkaAvroDeserializer,
  ) {
    this.config = kafkaModuleConfigurationProvider.get();
    this.kafka = new Kafka({
      ...this.config.client,
      logCreator: this.kafkaLogger.getKafkaJSLoggingAdapter,
    });
    if (this.config.consumer) {
      this.consumer = this.kafka.consumer(this.config.consumer);
    }
    if (this.config.producer) {
      this.producer = this.kafka.producer(this.config.producer);
    }
    this.admin = this.kafka.admin();
  }

  /**
   * Connect to Kafka brokers and initialize schema registry and serializers
   */
  async connect(): Promise<void> {
    const topics = this.kafkaEventHandlerService.getTopics() ?? [];
    if (this.producer) {
      await this.producer.connect();
      await this.kafkaAvroSerializer.initialize(this.config.schemaRegistry, [
        ...topics,
        ...(this.config?.producer?.topics ?? []),
      ]);
    }
    if (this.consumer) {
      await this.consumer.connect();
      let subjectProbe: string = undefined;
      if (topics.length > 0) {
        subjectProbe = getSchemaRegistryValueSubjectByTopic(
          topics[Math.floor(Math.random() * topics.length)],
        );
      }
      await this.kafkaAvroDeserializer.initialize(
        this.config.schemaRegistry,
        subjectProbe,
      );
    }
    await this.admin.connect();
  }

  /**
   * Disconnect everything
   */
  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }
    if (this.consumer) {
      await this.consumer.stop();
      await this.consumer.disconnect();
    }
    await this.admin.disconnect();
  }

  /**
   * Bootstrap all needed data before application is started.
   * Has the good side-effect that errors are directly detected so
   * a not running or wrong configured Kafka setup does not lead to data inconsistencies.
   */
  async onApplicationBootstrap(): Promise<void> {
    await retry(async () => this.connect(), 5, 3);
    await this.fetchTopicOffsets();
    await this.subscribeToTopics();
    await this.bindEventHandlers();
  }

  /**
   * Disconnect after all listeners are closed
   */
  async onApplicationShutdown(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Fetch all topic offsets
   * (for later ...)
   * @private
   */
  private async fetchTopicOffsets(): Promise<void> {
    for await (const topic of this.kafkaEventHandlerService.getTopics()) {
      try {
        const topicOffsets = await this.admin.fetchTopicOffsets(topic);
        this.topicOffsets.set(topic, topicOffsets);
      } catch (reject) {
        this.kafkaLogger.error(
          `Error while fetching topic offset for ${topic}`,
          reject,
        );
        throw reject;
      }
    }
  }

  /**
   * Subscribe to all topics where an event handler is registered
   * @private
   */
  private async subscribeToTopics(): Promise<void> {
    for await (const topic of this.kafkaEventHandlerService.getTopics()) {
      try {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      } catch (reject) {
        this.kafkaLogger.error(
          `Error while subscribing to topic ${topic}`,
          reject,
        );
        throw reject;
      }
    }
  }

  /**
   * Bind all registered event handlers to topics
   * @private
   */
  private bindEventHandlers(): void {
    if (!this.consumer) {
      return;
    }
    this.consumer.run({
      ...(this.config?.consumerRunConfig ?? {}),
      eachMessage: async ({ topic, message }) => {
        try {
          // retry once
          await retry(
            async () => {
              const event = await this.kafkaAvroDeserializer.deserialize(
                message,
              );
              await this.kafkaEventHandlerService.callEventHandler(
                topic,
                event,
              );
            },
            5,
            1,
            (reason) => {
              this.kafkaLogger.warn(
                `Retrying to process message on topic ${topic}.`,
                reason,
              );
            },
          );
        } catch (reject) {
          this.kafkaLogger.error(
            `Error while processing message on topic ${topic}.`,
            reject,
          );
        }
      },
    });
  }

  /**
   * Emit one or more events
   * @param payload
   */
  async emit(
    payload: EmitKafkaEventPayload | EmitKafkaEventPayload[],
  ): Promise<void> {
    if (!this.producer) {
      this.kafkaLogger.error(
        `Cannot emit event(s) on topic(s) ${
          Array.isArray(payload)
            ? payload.map((p) => p.topic).join(', ')
            : payload.topic
        }`,
      );
      return;
    }
    try {
      if (Array.isArray(payload)) {
        const topicMessages: TopicMessages[] = [];
        for await (const p of payload) {
          topicMessages.push({
            messages: [await this.kafkaAvroSerializer.serialize(p)],
            topic: p.topic,
          });
        }
        await this.producer.sendBatch({
          topicMessages,
        });
        return;
      }
      await this.producer.send({
        topic: payload.topic,
        messages: [await this.kafkaAvroSerializer.serialize(payload)],
      });
    } catch (reject) {
      this.kafkaLogger.log(
        `Error while emitting event(s): ${JSON.stringify(payload)}`,
        reject,
      );
    }
  }
}
