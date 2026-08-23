import type { NodeEffectContribution } from '../types';
import type { CardVariableConfig } from './config';

export const cardVariableEffects: NodeEffectContribution<CardVariableConfig> = {
  derivedOutput(context) {
    return context.node.output?.type === 'CardCollection'
      ? context.node.output
      : { type: 'CardCollection', cardIds: [] };
  },
};
