import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import {
  IKafkaModuleOptionsFactory,
  IKafkaModuleRegisterAsyncOptions,
} from './interfaces';
import { KafkaService } from './kafka.service';
import {
  KAFKA_MODULE_CONFIGURATION,
  KafkaModuleConfigurationProvider,
} from './providers';

@Global()
@Module({})
export class KafkaModule {
  /**
   * Register asynchronously
   * @param options
   */
  public static registerAsync(
    options: IKafkaModuleRegisterAsyncOptions,
  ): DynamicModule {
    const svc: Provider = {
      provide: KafkaService,
      useFactory: async (
        kafkaModuleConfigurationProvider: KafkaModuleConfigurationProvider,
      ) => {
        return new KafkaService(kafkaModuleConfigurationProvider.get());
      },
      inject: [KafkaModuleConfigurationProvider],
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
}
