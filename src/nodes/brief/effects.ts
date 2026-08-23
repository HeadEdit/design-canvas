import type { ExecutionEffectContext, NodeEffectContribution } from '../types';
import {
  countBriefRequiredFields,
  formatBriefText,
  type BriefConfig,
} from './config';
import { takeBriefConfigPatch } from './execution';

export const briefEffects: NodeEffectContribution<BriefConfig> = {
  derivedOutput({ config }) {
    const value = countBriefRequiredFields(config).filled === 0
      ? ''
      : formatBriefText(config);
    return { type: 'Text' as const, value };
  },
  executionEffects(context: ExecutionEffectContext<BriefConfig>) {
    const patch = takeBriefConfigPatch(context.nodeId);
    if (patch) {
      context.capabilities.workflow.patchConfig(context.nodeId, patch);
    }
  },
};
