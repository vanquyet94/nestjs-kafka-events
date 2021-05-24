export const KAFKA_EVENT_HANDLER_MAP: Map<string, any> = new Map();

export function EventHandler(topic: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const handlerMethod = target[propertyKey];
    KAFKA_EVENT_HANDLER_MAP.set(topic, handlerMethod);
    return descriptor;
  };
}
