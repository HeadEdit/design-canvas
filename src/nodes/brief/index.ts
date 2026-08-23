import type { NodePlugin } from '../types';
import { briefConfigSchema, type BriefConfig } from './config';
import { briefDefinition } from './definition';
import { briefEffects } from './effects';
import { briefExecution } from './execution';
import { briefUi } from './ui';

export const briefPlugin: NodePlugin<BriefConfig> = {
  kind: 'brief',
  configSchema: briefConfigSchema,
  definition: briefDefinition,
  execution: briefExecution,
  effects: briefEffects,
  ui: briefUi,
  requiredCapabilities: ['workflow', 'execution', 'ai'],
};
