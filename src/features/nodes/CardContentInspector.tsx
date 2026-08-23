import { CardContentInspector as PluginInspector } from '../../nodes/card-content/ui';
import { cardContentConfigSchema } from '../../nodes/card-content/config';
import type { CandidateCard, Workflow, WorkflowNode } from '../../domain/model';

export function CardContentInspector({
  node,
  workflow,
  cards = [],
  onSelectCardContent,
}: {
  node: WorkflowNode;
  workflow?: Workflow;
  cards?: readonly CandidateCard[];
  onSelectCardContent?(nodeId: string, cardId: string): void;
}) {
  const parsed = cardContentConfigSchema.safeParse(node.config);
  if (!parsed.success) {
    return null;
  }
  return (
    <PluginInspector
      node={node}
      config={parsed.data}
      workflow={workflow}
      cards={cards}
      patchConfig={(patch) => {
        const sourceCardId = (patch as { sourceCardId?: string }).sourceCardId;
        if (sourceCardId) {
          onSelectCardContent?.(node.id, sourceCardId);
        }
        return { ok: true, config: patch };
      }}
    />
  );
}
