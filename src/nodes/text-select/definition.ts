import { freezeDefinition } from '../freeze-definition';
import { defaultTextSelectConfig } from './config';

export const textSelectDefinition = freezeDefinition({
  kind: 'textSelect',
  category: 'content',
  label: '文本选择',
  inputs: [{ id: 'input', label: '结构化文本', type: 'TextStruct' }],
  outputs: [{ id: 'text', label: '文本', type: 'Text' }],
  autoRun: false,
  defaultConfig: defaultTextSelectConfig,
});
