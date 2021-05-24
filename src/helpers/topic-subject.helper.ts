export const TOPIC_SUBJECT_SEPARATOR = '-';
export const TOPIC_SUBJECT_VALUE_SUFFIX = 'value';
export const TOPIC_SUBJECT_KEY_SUFFIX = 'key';

/**
 * Value subject for given topic. Naming convention is best practice
 * @param topic
 */
export const getSchemaRegistryValueSubjectByTopic = (topic: string): string => {
  return topic + TOPIC_SUBJECT_SEPARATOR + TOPIC_SUBJECT_VALUE_SUFFIX;
};

/**
 * Key subject for given topic. Naming convention is best practice
 * @param topic
 */
export const getSchemaRegistryKeySubjectByTopic = (topic: string): string => {
  return topic + TOPIC_SUBJECT_SEPARATOR + TOPIC_SUBJECT_KEY_SUFFIX;
};
