import { Injectable } from '@nestjs/common';
import { MetadataScanner, ModulesContainer } from '@nestjs/core';
import { KAFKA_EVENT_HANDLER, KafkaEventHandlerMetadata } from './decorators';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Controller } from '@nestjs/common/interfaces';
import { KafkaEventHandlerFunction } from './interfaces/kafka-event.interface';

@Injectable()
export class KafkaEventHandlerService {
  private readonly eventHandlerMap: Map<string, KafkaEventHandlerFunction>;

  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly metadataScanner: MetadataScanner,
  ) {
    this.eventHandlerMap = new Map();
  }

  /**
   * Utilize NestJS to scan for metadata
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
    }
  }

  getEventHandlerMap(): Map<string, KafkaEventHandlerFunction> {
    return this.eventHandlerMap;
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
