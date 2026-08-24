import type { CandidateCard, NodeOutput, ReferenceDocument, Workflow } from '../domain/model';
import { builtinNodePlatform } from './builtins';
import type { NodePlatform } from './create-node-platform';

export function applyDerivedNodeOutputs(
  workflow: Workflow,
  cards: readonly CandidateCard[],
  documents: readonly ReferenceDocument[] = [],
  platform: NodePlatform = builtinNodePlatform,
): Workflow {
  let current = workflow;
  for (const plugin of platform.plugins.values()) {
    const derived = plugin.effects?.derivedOutput;
    if (!derived) {
      continue;
    }
    current = {
      ...current,
      nodes: current.nodes.map((node) => {
        if (node.kind !== plugin.kind) {
          return node;
        }
        const parsed = plugin.configSchema.safeParse(node.config);
        if (!parsed.success) {
          return node;
        }
        const output: NodeOutput | undefined = derived({
          node,
          config: parsed.data,
          workflow: current,
          cards,
          documents,
        });
        return { ...node, output };
      }),
    };
  }
  return current;
}
