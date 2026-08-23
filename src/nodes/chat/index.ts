import type { NodePlugin } from '../types';
import { chatConfigSchema, type ChatConfig } from './config';
import { chatDefinition } from './definition';
import { chatEffects } from './session';
import { chatUi } from './ui';

export const chatPlugin: NodePlugin<ChatConfig> = {
  kind: 'chat',
  configSchema: chatConfigSchema,
  definition: chatDefinition,
  effects: chatEffects,
  ui: chatUi,
  requiredCapabilities: ['workflow', 'sessions', 'ai'],
};
