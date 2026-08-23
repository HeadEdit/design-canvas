import type { NodePlugin } from '../types';
import { contentExtractConfigSchema, type ContentExtractConfig } from './config';
import { contentExtractDefinition } from './definition';
import { contentExtractEffects } from './effects';
import { contentExtractExecution } from './execution';
import { contentExtractUi } from './ui';

export const contentExtractPlugin: NodePlugin<ContentExtractConfig> = {
  kind: 'contentExtract',
  configSchema: contentExtractConfigSchema,
  definition: contentExtractDefinition,
  execution: contentExtractExecution,
  effects: contentExtractEffects,
  ui: contentExtractUi,
  requiredCapabilities: ['workflow', 'execution', 'ai'],
};
