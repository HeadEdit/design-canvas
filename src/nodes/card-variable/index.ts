import type { NodePlugin } from '../types';
import { cardVariableConfigSchema, type CardVariableConfig } from './config';
import { cardVariableDefinition } from './definition';
import { cardVariableEffects } from './effects';
import { cardVariableUi } from './ui';

export const cardVariablePlugin: NodePlugin<CardVariableConfig> = {
  kind: 'cardVariable',
  configSchema: cardVariableConfigSchema,
  definition: cardVariableDefinition,
  effects: cardVariableEffects,
  ui: cardVariableUi,
  requiredCapabilities: ['workflow', 'cards'],
};
