import type { NodePlugin } from '../types';
import { textSelectConfigSchema, type TextSelectConfig } from './config';
import { textSelectDefinition } from './definition';
import { textSelectEffects } from './effects';
import { textSelectUi } from './ui';

export const textSelectPlugin: NodePlugin<TextSelectConfig> = {
  kind: 'textSelect',
  configSchema: textSelectConfigSchema,
  definition: textSelectDefinition,
  effects: textSelectEffects,
  ui: textSelectUi,
  requiredCapabilities: ['workflow'],
};
