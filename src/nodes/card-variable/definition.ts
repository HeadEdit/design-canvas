import { freezeDefinition } from '../freeze-definition';
import { defaultCardVariableConfig } from './config';

export const cardVariableDefinition = freezeDefinition({
  kind: 'cardVariable',
  category: 'variable',
  label: '卡片变量',
  inputs: [],
  outputs: [{ id: 'cards', label: '卡片', type: 'CardCollection' }],
  autoRun: false,
  defaultConfig: defaultCardVariableConfig,
});
