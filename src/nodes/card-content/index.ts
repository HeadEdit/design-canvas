import type { NodePlugin } from '../types';
import { cardContentConfigSchema, type CardContentConfig } from './config';
import { cardContentDefinition } from './definition';
import { cardContentEffects } from './effects';
import { cardContentUi } from './ui';

export const cardContentPlugin: NodePlugin<CardContentConfig> = {
  kind: 'cardContent',
  configSchema: cardContentConfigSchema,
  definition: cardContentDefinition,
  effects: cardContentEffects,
  ui: cardContentUi,
  requiredCapabilities: ['workflow', 'cards'],
};
