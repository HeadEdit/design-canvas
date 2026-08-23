import type { NodePlugin } from '../types';
import { structuredPlanConfigSchema, type StructuredPlanConfig } from './config';
import { structuredPlanDefinition } from './definition';
import { structuredPlanEffects } from './effects';
import { structuredPlanExecution } from './execution';
import { formatStructuredPlanOutput } from './format';
import { structuredPlanUi } from './ui';

export const structuredPlanPlugin: NodePlugin<StructuredPlanConfig> = {
  kind: 'structuredPlan',
  configSchema: structuredPlanConfigSchema,
  definition: structuredPlanDefinition,
  execution: structuredPlanExecution,
  effects: structuredPlanEffects,
  publication: {
    deriveOutput: (config) => formatStructuredPlanOutput(config.modules),
  },
  ui: structuredPlanUi,
  requiredCapabilities: ['workflow', 'execution', 'ai'],
};
