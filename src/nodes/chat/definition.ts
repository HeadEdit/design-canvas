import { freezeDefinition } from '../freeze-definition';
import { defaultChatConfig } from './config';

export const chatDefinition = freezeDefinition({
  kind: 'chat',
  category: 'generate',
  label: '聊天',
  inputs: [
    { id: 'text', label: '文本', type: 'Text[]', optional: true },
  ],
  outputs: [{ id: 'context', label: '上下文', type: 'TextStruct' }],
  autoRun: false,
  defaultConfig: defaultChatConfig,
});
