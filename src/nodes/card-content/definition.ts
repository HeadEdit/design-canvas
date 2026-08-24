import { freezeDefinition } from '../freeze-definition';
import { defaultCardContentConfig } from './config';

export const cardContentDefinition = freezeDefinition({
  kind: 'cardContent',
  category: 'select',
  label: '卡片内容',
  inputs: [{ id: 'cards', label: '卡片', type: 'CardCollection' }],
  outputs: [{ id: 'content', label: '内容', type: 'Text' }],
  autoRun: false,
  defaultConfig: defaultCardContentConfig,
});
