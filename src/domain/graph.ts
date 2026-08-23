import { canConnectPortTypes, getPort } from './node-definitions';
import { isControlEdge } from './control-flow';
import type { Workflow, WorkflowEdge } from './model';

export type ConnectionValidation = { ok: true } | { ok: false; reason: string };

function nodeIds(workflow: Workflow): Set<string> {
  return new Set(workflow.nodes.map((node) => node.id));
}

function workflowStructureError(workflow: Workflow): string | undefined {
  const ids = new Set<string>();

  for (const node of workflow.nodes) {
    if (ids.has(node.id)) {
      return '工作流包含重复节点 ID';
    }

    ids.add(node.id);
  }

  if (workflow.edges.some((edge) => (
    !ids.has(edge.sourceNodeId) || !ids.has(edge.targetNodeId)
  ))) {
    return '工作流包含无效连接';
  }

  if (workflow.containmentEdges.some((edge) => (
    !ids.has(edge.parentNodeId) || !ids.has(edge.childNodeId)
  ))) {
    return '工作流包含无效连接';
  }

  return undefined;
}

function assertValidWorkflowStructure(workflow: Workflow): void {
  const error = workflowStructureError(workflow);
  if (error) {
    throw new Error(error);
  }
}

function outgoingNodeIds(workflow: Workflow): Map<string, string[]> {
  const outgoing = new Map<string, string[]>();

  for (const edge of workflow.edges) {
    const targets = outgoing.get(edge.sourceNodeId) ?? [];
    targets.push(edge.targetNodeId);
    outgoing.set(edge.sourceNodeId, targets);
  }

  return outgoing;
}

function outgoingDataNodeIds(workflow: Workflow): Map<string, string[]> {
  const outgoing = new Map<string, string[]>();

  for (const edge of workflow.edges) {
    if (isControlEdge(workflow, edge)) continue;
    const targets = outgoing.get(edge.sourceNodeId) ?? [];
    targets.push(edge.targetNodeId);
    outgoing.set(edge.sourceNodeId, targets);
  }

  return outgoing;
}

export function wouldCreateCycle(
  workflow: Workflow,
  sourceId: string,
  targetId: string,
): boolean {
  assertValidWorkflowStructure(workflow);

  if (sourceId === targetId) {
    return true;
  }

  const outgoing = outgoingNodeIds(workflow);
  const visited = new Set<string>();
  const queue = [targetId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === sourceId) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }

    visited.add(current);
    queue.push(...(outgoing.get(current) ?? []));
  }

  return false;
}

export function validateConnection(
  workflow: Workflow,
  edge: WorkflowEdge,
): ConnectionValidation {
  const source = workflow.nodes.find((node) => node.id === edge.sourceNodeId);
  if (!source) {
    return { ok: false, reason: '源节点不存在' };
  }

  const target = workflow.nodes.find((node) => node.id === edge.targetNodeId);
  if (!target) {
    return { ok: false, reason: '目标节点不存在' };
  }

  if (edge.sourceNodeId === edge.targetNodeId) {
    return { ok: false, reason: '工作流不能形成环路' };
  }

  const sourcePort = getPort(source.kind, 'output', edge.sourcePortId);
  if (!sourcePort) {
    return { ok: false, reason: '源输出端口不存在' };
  }

  const targetPort = getPort(target.kind, 'input', edge.targetPortId);
  if (!targetPort) {
    return { ok: false, reason: '目标输入端口不存在' };
  }

  if (!canConnectPortTypes(sourcePort.type, targetPort.type)) {
    return { ok: false, reason: '端口类型不兼容' };
  }

  if (sourcePort.type === 'Control' || targetPort.type === 'Control') {
    if (sourcePort.id !== 'execOut' || targetPort.id !== 'exec') {
      return { ok: false, reason: '端口类型不兼容' };
    }
  }

  const structuralError = workflowStructureError(workflow);
  if (structuralError) {
    return { ok: false, reason: structuralError };
  }

  if (workflow.edges.some((existing) => (
    existing.sourceNodeId === edge.sourceNodeId
    && existing.sourcePortId === edge.sourcePortId
    && existing.targetNodeId === edge.targetNodeId
    && existing.targetPortId === edge.targetPortId
  ))) {
    return { ok: false, reason: '连接已存在' };
  }

  if (workflow.edges.some((existing) => (
    existing.targetNodeId === edge.targetNodeId
    && existing.targetPortId === edge.targetPortId
  )) && targetPort.type !== 'Text[]') {
    return { ok: false, reason: '目标输入端口已连接' };
  }

  if (
    sourcePort.type === 'Control'
    && workflow.edges.some((existing) => (
      existing.sourceNodeId === edge.sourceNodeId
      && existing.sourcePortId === edge.sourcePortId
    ))
  ) {
    return { ok: false, reason: '执行输出端口已连接' };
  }

  if (wouldCreateCycle(workflow, edge.sourceNodeId, edge.targetNodeId)) {
    return { ok: false, reason: '工作流不能形成环路' };
  }

  return { ok: true };
}

export { rewriteRetiredChatSelectionEdges } from '../nodes/chat/migrate';
export { dropRetiredContentExtractOutputEdges } from '../nodes/content-extract/migrate';
export {
  dropCardsOutsideVariablePools,
  migrateLegacyCardVariableGraph,
  stripRetiredCardBrowserNodes,
} from '../nodes/card-variable/migrate';

export function topologicalSort(workflow: Workflow): string[] {
  assertValidWorkflowStructure(workflow);

  const order = new Map(workflow.nodes.map((node, index) => [node.id, index]));
  const indegree = new Map(workflow.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();

  for (const edge of workflow.edges) {
    if (isControlEdge(workflow, edge)) continue;
    indegree.set(edge.targetNodeId, (indegree.get(edge.targetNodeId) ?? 0) + 1);
    const targets = outgoing.get(edge.sourceNodeId) ?? [];
    targets.push(edge.targetNodeId);
    outgoing.set(edge.sourceNodeId, targets);
  }

  const ready = workflow.nodes
    .filter((node) => indegree.get(node.id) === 0)
    .map((node) => node.id);
  const sorted: string[] = [];

  while (ready.length > 0) {
    const nodeId = ready.shift()!;
    sorted.push(nodeId);

    for (const targetId of outgoing.get(nodeId) ?? []) {
      const nextIndegree = (indegree.get(targetId) ?? 0) - 1;
      indegree.set(targetId, nextIndegree);
      if (nextIndegree === 0) {
        ready.push(targetId);
      }
    }

    ready.sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
  }

  if (sorted.length !== workflow.nodes.length) {
    throw new Error('工作流包含环路，无法拓扑排序');
  }

  return sorted;
}

function collectDescendantNodeIds(workflow: Workflow, nodeId: string): string[] {
  if (!nodeIds(workflow).has(nodeId)) {
    return [];
  }

  const outgoing = outgoingDataNodeIds(workflow);
  const descendants: string[] = [];
  const visited = new Set<string>([nodeId]);
  const queue = [...(outgoing.get(nodeId) ?? [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) {
      continue;
    }

    visited.add(current);
    descendants.push(current);
    queue.push(...(outgoing.get(current) ?? []));
  }

  return descendants;
}

export function descendantNodeIds(workflow: Workflow, nodeId: string): string[] {
  assertValidWorkflowStructure(workflow);
  return collectDescendantNodeIds(workflow, nodeId);
}

function collectContainedChildIds(workflow: Workflow, nodeIdsToExpand: Iterable<string>): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const edge of workflow.containmentEdges) {
    const children = childrenByParent.get(edge.parentNodeId) ?? [];
    children.push(edge.childNodeId);
    childrenByParent.set(edge.parentNodeId, children);
  }

  const extra: string[] = [];
  const visited = new Set<string>(nodeIdsToExpand);
  const queue = [...visited];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (visited.has(childId)) {
        continue;
      }
      visited.add(childId);
      extra.push(childId);
      queue.push(childId);
    }
  }

  return extra;
}

export function deletionImpact(
  workflow: Workflow,
  nodeId: string,
): { nodeIds: string[]; edgeIds: string[]; containmentEdgeIds: string[] } {
  assertValidWorkflowStructure(workflow);

  if (!nodeIds(workflow).has(nodeId)) {
    return { nodeIds: [], edgeIds: [], containmentEdgeIds: [] };
  }

  const descendants = collectDescendantNodeIds(workflow, nodeId);
  const nodesToRemove = new Set([nodeId, ...descendants]);
  const containedChildren = collectContainedChildIds(workflow, nodesToRemove);
  for (const childId of containedChildren) {
    nodesToRemove.add(childId);
  }

  const orderedNodeIds = [nodeId, ...descendants];
  for (const childId of containedChildren) {
    if (!orderedNodeIds.includes(childId)) {
      orderedNodeIds.push(childId);
    }
  }

  return {
    nodeIds: orderedNodeIds,
    edgeIds: workflow.edges
      .filter((edge) => (
        nodesToRemove.has(edge.sourceNodeId) || nodesToRemove.has(edge.targetNodeId)
      ))
      .map((edge) => edge.id),
    containmentEdgeIds: workflow.containmentEdges
      .filter((edge) => (
        nodesToRemove.has(edge.parentNodeId) || nodesToRemove.has(edge.childNodeId)
      ))
      .map((edge) => edge.id),
  };
}

export function markDescendantsStale(workflow: Workflow, nodeId: string): Workflow {
  assertValidWorkflowStructure(workflow);

  const staleNodeIds = new Set(collectDescendantNodeIds(workflow, nodeId));

  if (staleNodeIds.size === 0) {
    return workflow;
  }

  return {
    ...workflow,
    nodes: workflow.nodes.map((node) => (
      staleNodeIds.has(node.id) ? { ...node, status: 'stale' } : node
    )),
  };
}
