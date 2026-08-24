import { freezeDefinition } from '../freeze-definition';
import { defaultDivergenceConfig } from './config';

export const divergenceDefinition = freezeDefinition({
  kind: 'divergence',
  category: 'generate',
  label: '发散',
  inputs: [
    { id: 'exec', label: '执行', type: 'Control', optional: true },
    { id: 'pool', label: '池', type: 'CardCollection' },
    { id: 'prompt', label: '提示词', type: 'Text', optional: true },
  ],
  outputs: [
    { id: 'execOut', label: '执行', type: 'Control', optional: true },
  ],
  autoRun: true,
  defaultConfig: defaultDivergenceConfig,
});
