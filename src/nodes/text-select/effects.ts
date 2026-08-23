import { textStructInput } from '../../domain/workflow-io';
import type { NodeEffectContribution } from '../types';
import type { TextSelectConfig } from './config';

export const textSelectEffects: NodeEffectContribution<TextSelectConfig> = {
  derivedOutput(context) {
    const items = textStructInput(context.workflow, context.node.id, 'input');
    const item = items.find((it) => it.id === context.config.sourceItemId);
    if (!item) return undefined;
    return { type: 'Text' as const, value: item.content };
  },
};
