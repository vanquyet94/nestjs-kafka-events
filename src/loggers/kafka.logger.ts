import { Injectable, Logger, Scope } from '@nestjs/common';
import {
  LogEntry as KafkaJSLogEntry,
  logLevel as KafkaJSLogLevel,
} from 'kafkajs';

@Injectable({ scope: Scope.TRANSIENT })
export class KafkaLogger extends Logger {
  constructor() {
    super('Kafka', true);
  }

  /**
   * Adapts the KafkaJS logging interface to use the NestJS-specific logger
   * @param logLevel
   */
  getKafkaJSLoggingAdapter(
    logLevel: KafkaJSLogLevel,
  ): (logEntry: KafkaJSLogEntry) => void {
    return (logEntry) => {
      let method: keyof KafkaLogger;
      switch (logLevel) {
        case KafkaJSLogLevel.ERROR:
        case KafkaJSLogLevel.NOTHING:
          method = 'error';
          break;
        case KafkaJSLogLevel.WARN:
          method = 'warn';
          break;
        case KafkaJSLogLevel.INFO:
          method = 'log';
          break;
        case KafkaJSLogLevel.DEBUG:
        default:
          method = 'debug';
          break;
      }
      const { label, namespace } = logEntry;
      const { message, ...rest } = logEntry.log;
      this[method](
        `${label} [${namespace}] ${message} ${JSON.stringify(rest)}`,
      );
    };
  }
}
