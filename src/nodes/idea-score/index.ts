import type { NodePlugin } from '../types';
import { ideaScoreConfigSchema, type IdeaScoreConfig } from './config';
import { ideaScoreDefinition } from './definition';
import { ideaScoreEffects } from './effects';
import { ideaScoreExecution } from './execution';
import { ideaScoreUi } from './ui';

export const ideaScorePlugin: NodePlugin<IdeaScoreConfig> = {
  kind: 'ideaScore',
  configSchema: ideaScoreConfigSchema,
  definition: ideaScoreDefinition,
  execution: ideaScoreExecution,
  effects: ideaScoreEffects,
  ui: ideaScoreUi,
  requiredCapabilities: ['workflow', 'execution', 'cards', 'ai'],
};
