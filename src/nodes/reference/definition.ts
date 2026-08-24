import { freezeDefinition } from '../freeze-definition';
import { defaultReferenceConfig } from './config';

export const referenceDefinition = freezeDefinition({
  kind: 'reference',
  category: 'select',
  label: '资料库',
  inputs: [],
  outputs: [{ id: 'text', label: '引用文本', type: 'Text[]' }],
  autoRun: false,
  defaultConfig: defaultReferenceConfig,
});
