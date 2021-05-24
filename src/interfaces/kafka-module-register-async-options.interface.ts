import { ModuleMetadata, Type } from '@nestjs/common';
import { IKafkaModuleConfiguration } from './kafka-module-configuration.interface';

export interface IKafkaModuleOptionsFactory {
  creatKafkaModuleOptions():
    | Promise<IKafkaModuleConfiguration>
    | IKafkaModuleConfiguration;
}

export interface IKafkaModuleRegisterAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<IKafkaModuleOptionsFactory>;
  useClass?: Type<IKafkaModuleOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<IKafkaModuleConfiguration> | IKafkaModuleConfiguration;
}
