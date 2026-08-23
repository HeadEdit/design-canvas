import { freezeDefinition } from '../freeze-definition';
import { defaultIdeaScoreConfig } from './config';

export const ideaScoreDefinition = freezeDefinition({
  kind: 'ideaScore',
  category: 'processing',
  label: '创意评分',
  inputs: [
    { id: 'exec', label: '执行', type: 'Control', optional: true },
    { id: 'cards', label: '池', type: 'CardCollection' },
    { id: 'context', label: '上下文', type: 'Text', optional: true },
  ],
  outputs: [
    { id: 'execOut', label: '执行', type: 'Control', optional: true },
  ],
  autoRun: false,
  defaultConfig: defaultIdeaScoreConfig,
});
