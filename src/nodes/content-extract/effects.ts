import type { ExecutionEffectContext, NodeEffectContribution } from '../types';
import type { ContentExtractConfig } from './config';
import { takeContentExtractConfigPatch } from './execution';

export const contentExtractEffects: NodeEffectContribution<ContentExtractConfig> = {
  executionEffects(context: ExecutionEffectContext<ContentExtractConfig>) {
    const patch = takeContentExtractConfigPatch(context.nodeId);
    if (patch) {
      context.capabilities.workflow.patchConfig(context.nodeId, patch);
    }
  },
};
