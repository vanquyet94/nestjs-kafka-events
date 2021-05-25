import { Inject, Injectable } from '@nestjs/common';
import { IKafkaModuleConfiguration } from '../interfaces';

export const KAFKA_MODULE_CONFIGURATION = 'KAFKA_MODULE_CONFIGURATION';

@Injectable()
export class KafkaModuleConfigurationProvider {
  constructor(
    @Inject(KAFKA_MODULE_CONFIGURATION)
    private readonly kafkaModuleConfiguration: IKafkaModuleConfiguration,
  ) {}

  get(): IKafkaModuleConfiguration {
    return this.kafkaModuleConfiguration;
  }
}
