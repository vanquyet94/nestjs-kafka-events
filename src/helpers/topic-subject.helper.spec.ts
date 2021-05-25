import {
  getSchemaRegistryValueSubjectByTopic,
  getSchemaRegistryKeySubjectByTopic,
  TOPIC_SUBJECT_SEPARATOR,
  TOPIC_SUBJECT_VALUE_SUFFIX,
  TOPIC_SUBJECT_KEY_SUFFIX,
} from './topic-subject.helper';

describe('TopicSubjectHelper', () => {
  it('returns a correct value subject for given topic', () => {
    expect(getSchemaRegistryValueSubjectByTopic('my.test.topic')).toEqual(
      'my.test.topic' + TOPIC_SUBJECT_SEPARATOR + TOPIC_SUBJECT_VALUE_SUFFIX,
    );
  });

  it('returns a correct key subject for given topic', () => {
    expect(getSchemaRegistryKeySubjectByTopic('my.test.topic')).toEqual(
      'my.test.topic' + TOPIC_SUBJECT_SEPARATOR + TOPIC_SUBJECT_KEY_SUFFIX,
    );
  });
});
