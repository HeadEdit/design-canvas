import { formatCandidateCardText } from '../../domain/card-text';
import { cardCollectionInputIds } from '../../domain/workflow-io';
import type { NodeEffectContribution } from '../types';
import type { CardContentConfig } from './config';

export const cardContentEffects: NodeEffectContribution<CardContentConfig> = {
  derivedOutput(context) {
    const ids = cardCollectionInputIds(context.workflow, context.node.id, 'cards');
    const card = context.cards.find((item) => item.id === context.config.sourceCardId);
    if (!card || !ids.includes(card.id)) {
      return undefined;
    }
    return { type: 'Text' as const, value: formatCandidateCardText(card) };
  },
};
