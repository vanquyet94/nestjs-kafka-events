import { Injectable } from '@nestjs/common';
import { MetadataScanner, ModulesContainer } from '@nestjs/core';
import { KAFKA_EVENT_HANDLER, KafkaEventHandlerMetadata } from './decorators';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Controller } from '@nestjs/common/interfaces';
import {
  IKafkaEvent,
  KafkaEventHandlerFunction,
} from './interfaces/kafka-event.interface';
import { KafkaLogger } from './loggers';

@Injectable()
export class KafkaEventHandlerService {
  private readonly eventHandlerMap: Map<string, KafkaEventHandlerFunction>;

  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataScanner: MetadataScanner,
    private readonly kafkaLogger: KafkaLogger,
  ) {
    this.eventHandlerMap = new Map();
  }

  /**
   * Utilize NestJS to scan for metadata.
   * Event Handler methods need to resist in a mounted controller
   * and need to be decorated with the EventHandler(topic) decorator
   */
  explore(): void {
    const modules = [...this.modulesContainer.values()];
    const controllersMap = modules
      .filter(({ controllers }) => controllers.size > 0)
      .map(({ controllers }) => controllers);
    const instanceWrappers: InstanceWrapper<Controller>[] = [];
    controllersMap.forEach((map) => {
      const mapKeys = [...map.keys()];
      instanceWrappers.push(
        ...mapKeys.map((key) => {
          return map.get(key);
        }),
      );
    });
    const eventHandlers = instanceWrappers
      .map(({ instance }) => {
        const instancePrototype = Object.getPrototypeOf(instance);
        return this.metadataScanner.scanFromPrototype(
          instance,
          instancePrototype,
          (method) =>
            this.exploreMethodMetadata(instance, instancePrototype, method),
        );
      })
      .reduce((prev, curr) => {
        return prev.concat(curr);
      });
    for (const eventHandler of eventHandlers) {
      this.eventHandlerMap.set(eventHandler.topic, eventHandler.callback);
      this.kafkaLogger.debug(
        `Registered method ${String(
          eventHandler.methodName,
        )} as event handler for topic ${eventHandler.topic}`,
      );
    }
  }

  /**
   * Get all topics
   */
  getTopics(): string[] {
    return Array.from(this.eventHandlerMap.keys());
  }

  /**
   * Call registered event handler for given topic
   * @param topic
   * @param event
   */
  async callEventHandler(topic: string, event: IKafkaEvent): Promise<void> {
    const handler = this.eventHandlerMap.get(topic);
    if (!handler) {
      this.kafkaLogger.warn(`Unable to find handler for topic ${topic}`);
      return;
    }
    return await handler(event);
  }

  /**
   * Explore methods metadata
   * @param instance
   * @param instancePrototype
   * @param methodKey
   * @private
   */
  private exploreMethodMetadata(
    instance: any,
    instancePrototype: Controller,
    methodKey: string,
  ): KafkaEventHandlerMetadata | null {
    const targetCallback = instancePrototype[methodKey];
    const handler = Reflect.getMetadata(KAFKA_EVENT_HANDLER, targetCallback);
    if (handler == null) {
      return null;
    }
    return handler;
  }
}
