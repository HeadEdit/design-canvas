import type { NodePlugin } from '../types';
import { divergenceConfigSchema, type DivergenceConfig } from './config';
import { divergenceDefinition } from './definition';
import { divergenceExecution } from './execution';
import { divergenceEffects } from './effects';
import { divergenceUi } from './ui';

export const divergencePlugin: NodePlugin<DivergenceConfig> = {
  kind: 'divergence',
  configSchema: divergenceConfigSchema,
  definition: divergenceDefinition,
  execution: divergenceExecution,
  effects: divergenceEffects,
  ui: divergenceUi,
  requiredCapabilities: ['workflow', 'execution', 'cards', 'ai'],
};
