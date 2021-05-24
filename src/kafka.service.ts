import { Injectable } from '@nestjs/common';
import { IKafkaModuleConfiguration } from './interfaces';

@Injectable()
export class KafkaService {
  constructor(configuration: IKafkaModuleConfiguration) {}
}
