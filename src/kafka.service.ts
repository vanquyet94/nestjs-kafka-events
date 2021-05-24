import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { KafkaEventHandlerService } from './kafka-event-handler.service';
import { KafkaModuleConfigurationProvider } from './providers';
import { retry } from './helpers/retry.util';

@Injectable()
export class KafkaService implements OnApplicationBootstrap {
  constructor(
    private readonly kafkaModuleConfigurationProvider: KafkaModuleConfigurationProvider,
    private readonly kafkaEventHandlerService: KafkaEventHandlerService,
  ) {}

  async connect(): Promise<void> {
    console.log(
      `binding topics: ${Array.from(
        this.kafkaEventHandlerService.getEventHandlerMap().keys(),
      ).join(' | ')}`,
    );
    console.log('got config: ', this.kafkaModuleConfigurationProvider.get());
    await new Promise((resolve) => setTimeout(resolve, 2 * 1000));
  }

  async onApplicationBootstrap(): Promise<void> {
    return await retry(async () => this.connect(), 5, 3, console.error);
  }
}
