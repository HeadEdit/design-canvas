import type { NodeEffectContribution } from '../types';
import type { StructuredPlanConfig } from './config';

export const structuredPlanEffects: NodeEffectContribution<StructuredPlanConfig> = {
  executionEffects(context) {
    const patch = context.consumeConfigPatch?.();
    if (!patch) return;
    return context.capabilities.workflow.validateConfigPatch(context.nodeId, patch);
  },
};
