import { requireCardVariableSource } from '../../domain/require-card-variable-source';
import type { ExecutionEffectContext, NodeEffectContribution } from '../types';
import { sortedIdeaScoreOutputCardIds, type IdeaScoreConfig } from './config';
import { takeIdeaScoreConfigPatch } from './execution';

export const ideaScoreEffects: NodeEffectContribution<IdeaScoreConfig> = {
  executionEffects(context: ExecutionEffectContext<IdeaScoreConfig>) {
    const patch = takeIdeaScoreConfigPatch(context.nodeId);
    if (!patch) {
      return;
    }
    context.capabilities.workflow.patchConfig(context.nodeId, patch);
    if (!patch.report) {
      return;
    }
    const workflow = context.capabilities.workflow.getWorkflow();
    const binding = workflow
      ? requireCardVariableSource(workflow, context.nodeId, 'cards')
      : undefined;
    const currentIds = binding?.ok && binding.source.output?.type === 'CardCollection'
      ? binding.source.output.cardIds
      : [];
    context.capabilities.cards.reorderBoundCollection(
      context.nodeId,
      'cards',
      sortedIdeaScoreOutputCardIds(currentIds, patch.report.cards),
    );
  },
};
