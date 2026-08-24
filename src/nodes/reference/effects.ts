import type { NodeEffectContribution } from '../types';
import type { ReferenceConfig } from './config';

export const referenceEffects: NodeEffectContribution<ReferenceConfig> = {
  derivedOutput(context) {
    const byId = new Map(context.documents.map((doc) => [doc.id, doc]));
    const values = context.config.documentIds.flatMap((id) => {
      const doc = byId.get(id);
      return doc ? [`# ${doc.title}\n\n${doc.content}`] : [];
    });
    return values.length > 0 ? { type: 'Text[]' as const, values } : undefined;
  },
};
