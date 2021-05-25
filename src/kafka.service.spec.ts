import { KafkaService } from './kafka.service';
import { Test, TestingModule } from '@nestjs/testing';
import { KafkaEventFunctionsService } from './kafka-event-functions.service';
import { KafkaLogger } from './loggers';
import { KafkaAvroSerializer } from './serializer';
import { KafkaAvroDeserializer } from './deserializer';
import { KafkaModuleConfigurationProvider } from './providers';
import { Kafka } from 'kafkajs';

jest.mock('kafkajs');

describe('KafkaService', () => {
  let kafkaService: KafkaService;
  let kafkaEventFunctionsService: KafkaEventFunctionsService;
  let kafkaAvroSerializer: KafkaAvroSerializer;
  let kafkaAvroDeserializer: KafkaAvroDeserializer;

  const kafkaJSConsumerConnect = jest.fn();
  const kafkaJSConsumerDisconnect = jest.fn();
  const kafkaJSConsumerStop = jest.fn();
  const kafkaJSConsumerRun = jest.fn();
  const kafkaJSConsumerSubscribe = jest.fn();

  const kafkaJSProducerConnect = jest.fn();
  const kafkaJSProducerDisconnect = jest.fn();
  const kafkaJSProducerStop = jest.fn();
  const kafkaJSProducerSend = jest.fn();
  const kafkaJSProducerSendBatch = jest.fn();

  const kafkaJSAdminConnect = jest.fn();
  const kafkaJSAdminDisconnect = jest.fn();
  const kafkaJSAdminFetchTopicOffsets = jest.fn();

  jest.spyOn<any, any>(Kafka.prototype, 'consumer').mockReturnValue({
    connect: kafkaJSConsumerConnect,
    stop: kafkaJSConsumerStop,
    disconnect: kafkaJSConsumerDisconnect,
    run: kafkaJSConsumerRun,
    subscribe: kafkaJSConsumerSubscribe,
  });
  jest.spyOn<any, any>(Kafka.prototype, 'producer').mockReturnValue({
    connect: kafkaJSProducerConnect,
    disconnect: kafkaJSProducerDisconnect,
    stop: kafkaJSProducerStop,
    send: kafkaJSProducerSend,
    sendBatch: kafkaJSProducerSendBatch,
  });
  jest.spyOn<any, any>(Kafka.prototype, 'admin').mockReturnValue({
    connect: kafkaJSAdminConnect,
    disconnect: kafkaJSAdminDisconnect,
    fetchTopicOffsets: kafkaJSAdminFetchTopicOffsets,
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaService,
        {
          provide: KafkaEventFunctionsService,
          useValue: {
            getEventEmitterTopics: jest.fn(),
            getEventHandlerTopics: jest.fn(),
            callEventHandler: jest.fn(),
          },
        },
        {
          provide: KafkaModuleConfigurationProvider,
          useValue: {
            get: jest.fn().mockReturnValue({
              client: {
                brokers: ['PLAINTEXT://broker1:9092'],
              },
              consumer: {
                groupId: 'test-group',
              },
              producer: {},
            }),
          },
        },
        {
          provide: KafkaLogger,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
            getKafkaJSLoggingAdapter: jest.fn(),
          },
        },
        {
          provide: KafkaAvroSerializer,
          useValue: {
            initialize: jest.fn(),
            serialize: jest.fn(),
          },
        },
        {
          provide: KafkaAvroDeserializer,
          useValue: {
            initialize: jest.fn(),
            deserialize: jest.fn(),
          },
        },
      ],
    }).compile();

    kafkaService = module.get<KafkaService>(KafkaService);
    kafkaEventFunctionsService = module.get<KafkaEventFunctionsService>(
      KafkaEventFunctionsService,
    );
    kafkaAvroSerializer = module.get<KafkaAvroSerializer>(KafkaAvroSerializer);
    kafkaAvroDeserializer = module.get<KafkaAvroDeserializer>(
      KafkaAvroDeserializer,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(kafkaService).toBeDefined();
  });

  it('should handle all connections on application bootstrap / shutdown', async () => {
    const connectToSchemaRegistry = jest
      .spyOn<any, any>(kafkaService, 'connectToSchemaRegistry')
      .mockResolvedValueOnce(null);
    const bindEventHandlers = jest
      .spyOn<any, any>(kafkaService, 'bindEventHandlers')
      .mockResolvedValueOnce(null);
    jest
      .spyOn(kafkaEventFunctionsService, 'getEventHandlerTopics')
      .mockReturnValue(['topic1', 'topic2']);

    await kafkaService.onApplicationBootstrap();
    expect(kafkaJSProducerConnect).toHaveBeenCalled();
    expect(kafkaJSConsumerConnect).toHaveBeenCalled();
    expect(kafkaJSAdminConnect).toHaveBeenCalled();
    expect(kafkaJSAdminFetchTopicOffsets).toHaveBeenNthCalledWith(1, 'topic1');
    expect(kafkaJSAdminFetchTopicOffsets).toHaveBeenNthCalledWith(2, 'topic2');
    expect(kafkaJSConsumerSubscribe).toHaveBeenNthCalledWith(1, {
      fromBeginning: false,
      topic: 'topic1',
    });
    expect(kafkaJSConsumerSubscribe).toHaveBeenNthCalledWith(2, {
      fromBeginning: false,
      topic: 'topic2',
    });
    expect(connectToSchemaRegistry).toHaveBeenCalled();
    expect(bindEventHandlers).toHaveBeenCalled();

    await kafkaService.onApplicationShutdown();
    expect(kafkaJSProducerDisconnect).toHaveBeenCalled();
    expect(kafkaJSConsumerStop).toHaveBeenCalled();
    expect(kafkaJSConsumerDisconnect).toHaveBeenCalled();
    expect(kafkaJSAdminDisconnect).toHaveBeenCalled();
  });

  it('should connect to schema registry on app bootstrap', async () => {
    const eventHandlerTopics = ['topic1', 'topic2'];
    const eventEmitterTopics = ['topic3', 'topic4'];
    jest
      .spyOn(kafkaEventFunctionsService, 'getEventHandlerTopics')
      .mockReturnValue(eventHandlerTopics);
    jest
      .spyOn(kafkaEventFunctionsService, 'getEventEmitterTopics')
      .mockReturnValue(eventEmitterTopics);
    const serializerInit = jest.spyOn(kafkaAvroSerializer, 'initialize');
    const deserializerInit = jest.spyOn(kafkaAvroDeserializer, 'initialize');

    await kafkaService.onApplicationBootstrap();
    expect(serializerInit).toHaveBeenCalled();
    expect(serializerInit.mock.calls[0][1]).toEqual(eventEmitterTopics);
    expect(deserializerInit).toHaveBeenCalled();
    expect(
      eventHandlerTopics
        .map((e) => deserializerInit.mock.calls[0][1])
        .some((e) => e.startsWith(deserializerInit.mock.calls[0][1])),
    ).toEqual(true);
  });

  it('should bind relevant event handlers on app bootstrap', async () => {
    jest
      .spyOn<any, any>(kafkaService, 'connectToSchemaRegistry')
      .mockResolvedValueOnce(null);
    jest
      .spyOn(kafkaEventFunctionsService, 'getEventHandlerTopics')
      .mockReturnValue(['topic1', 'topic2']);
    let callEventHandler = jest
      .spyOn(kafkaEventFunctionsService, 'callEventHandler')
      .mockResolvedValue(null);
    const event = {
      event: {
        name: 'test',
      },
      key: {
        id: 'test-id',
      },
      arrival: new Date(),
    };
    jest.spyOn(kafkaAvroDeserializer, 'deserialize').mockResolvedValue(event);
    await kafkaService.onApplicationBootstrap();
    const eachMessage = kafkaJSConsumerRun.mock.calls[0][0].eachMessage;
    const msgPayload = {
      topic: 'my.test.topic',
      message: {
        key: Buffer.from(''),
        value: Buffer.from(''),
      },
    };

    await eachMessage(msgPayload);
    expect(callEventHandler).toHaveBeenCalledWith('my.test.topic', event);

    callEventHandler.mockReset();
    callEventHandler = jest
      .spyOn(kafkaEventFunctionsService, 'callEventHandler')
      .mockRejectedValue(new Error());
    await eachMessage(msgPayload);
    expect(callEventHandler).toHaveBeenCalledTimes(3);
  });

  it('emits event(s)', async () => {
    const payload1 = {
      event: {
        name: 'test1',
      },
      key: {
        id: 'test1-id',
      },
      topic: 'topic1',
    };
    const payload2 = {
      event: {
        name: 'test2',
      },
      key: {
        id: 'test2-id',
      },
      topic: 'topic2',
    };
    jest
      .spyOn(kafkaAvroSerializer, 'serialize')
      .mockImplementation(async (payload) => {
        return {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          key: Buffer.from(payload?.key?.id),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          value: Buffer.from(payload?.event?.name),
        };
      });

    await kafkaService.emit(payload1);
    expect(kafkaJSProducerSend).toHaveBeenCalledWith({
      topic: payload1.topic,
      messages: [
        {
          key: Buffer.from(payload1.key.id),
          value: Buffer.from(payload1.event.name),
        },
      ],
    });

    await kafkaService.emit([payload1, payload2]);
    expect(kafkaJSProducerSendBatch).toHaveBeenCalledWith({
      topicMessages: [
        {
          topic: payload1.topic,
          messages: [
            {
              key: Buffer.from(payload1.key.id),
              value: Buffer.from(payload1.event.name),
            },
          ],
        },
        {
          topic: payload2.topic,
          messages: [
            {
              key: Buffer.from(payload2.key.id),
              value: Buffer.from(payload2.event.name),
            },
          ],
        },
      ],
    });

    kafkaJSProducerSend.mockRejectedValue(new Error());
    await expect(kafkaService.emit(payload1, true)).resolves.not.toThrow();
    await expect(kafkaService.emit(payload1, false)).rejects.toThrow();
  });
});
