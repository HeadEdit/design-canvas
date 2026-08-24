import type { NodePlugin } from '../types';
import { referenceConfigSchema, type ReferenceConfig } from './config';
import { referenceDefinition } from './definition';
import { referenceEffects } from './effects';
import { referenceUi } from './ui';

export const referencePlugin: NodePlugin<ReferenceConfig> = {
  kind: 'reference',
  configSchema: referenceConfigSchema,
  definition: referenceDefinition,
  effects: referenceEffects,
  ui: referenceUi,
  requiredCapabilities: ['workflow'],
};
