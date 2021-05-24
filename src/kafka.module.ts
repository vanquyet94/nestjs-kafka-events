import {
  DynamicModule,
  Global,
  Module,
  OnModuleInit,
  Provider,
} from '@nestjs/common';
import {
  IKafkaModuleOptionsFactory,
  IKafkaModuleRegisterAsyncOptions,
} from './interfaces';
import { KafkaService } from './kafka.service';
import {
  KAFKA_MODULE_CONFIGURATION,
  KafkaModuleConfigurationProvider,
} from './providers';
import { KafkaEventHandlerService } from './kafka-event-handler.service';
import { MetadataScanner } from '@nestjs/core';

@Global()
@Module({
  providers: [KafkaEventHandlerService, MetadataScanner],
})
export class KafkaModule implements OnModuleInit {
  constructor(
    private readonly kafkaEventHandlerExplorerService: KafkaEventHandlerService,
  ) {}

  /**
   * Register asynchronously
   * @param options
   */
  public static registerAsync(
    options: IKafkaModuleRegisterAsyncOptions,
  ): DynamicModule {
    const svc: Provider = {
      provide: KafkaService,
      useClass: KafkaService,
      inject: [KafkaModuleConfigurationProvider, KafkaEventHandlerService],
    };
    const kafkaModuleConfigurationProvider: Provider =
      this.createKafkaModuleConfigurationProvider(options);
    return {
      module: KafkaModule,
      global: true,
      imports: options?.imports || [],
      providers: [
        kafkaModuleConfigurationProvider,
        KafkaModuleConfigurationProvider,
        svc,
      ],
      exports: [kafkaModuleConfigurationProvider, svc],
    };
  }

  /**
   * Create Configuration Provider
   * @param options
   * @private
   */
  private static createKafkaModuleConfigurationProvider(
    options: IKafkaModuleRegisterAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: KAFKA_MODULE_CONFIGURATION,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: KAFKA_MODULE_CONFIGURATION,
      useFactory: async (optionsFactory: IKafkaModuleOptionsFactory) =>
        await optionsFactory.creatKafkaModuleOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }

  /**
   * Explore all registered event handlers
   */
  onModuleInit() {
    this.kafkaEventHandlerExplorerService.explore();
  }
}
