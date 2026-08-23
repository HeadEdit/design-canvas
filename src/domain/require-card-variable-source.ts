import type { Workflow, WorkflowNode } from './model';

export const CARD_VARIABLE_SOURCE_REQUIRED = '池必须连接到卡片变量';

export function requireCardVariableSource(
  workflow: Workflow,
  consumerNodeId: string,
  inputPortId: string,
): { ok: true; source: WorkflowNode } | { ok: false; message: string } {
  const edge = workflow.edges.find(
    (item) => item.targetNodeId === consumerNodeId && item.targetPortId === inputPortId,
  );
  const source = edge
    ? workflow.nodes.find((item) => item.id === edge.sourceNodeId)
    : undefined;
  if (!source || source.kind !== 'cardVariable') {
    return { ok: false, message: CARD_VARIABLE_SOURCE_REQUIRED };
  }
  return { ok: true, source };
}
