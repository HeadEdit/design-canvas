import { getPort, lookupNodeDefinition } from './node-definitions';
import type { Workflow, WorkflowEdge, WorkflowNode } from './model';

export type ControlRunPlan =
  | { ok: true; nodeIds: string[]; rootId: string }
  | { ok: false; reason: string };

export function isControlEdge(workflow: Workflow, edge: WorkflowEdge): boolean {
  const source = workflow.nodes.find((node) => node.id === edge.sourceNodeId);
  if (!source) return false;
  return getPort(source.kind, 'output', edge.sourcePortId)?.type === 'Control';
}

function hasControlPorts(node: WorkflowNode): boolean {
  const definition = lookupNodeDefinition(node.kind);
  if (!definition) return false;
  return [...definition.inputs, ...definition.outputs].some((port) => port.type === 'Control');
}

function controlPredecessor(workflow: Workflow, nodeId: string): string | undefined {
  const incoming = workflow.edges.filter((edge) => (
    isControlEdge(workflow, edge)
    && edge.targetNodeId === nodeId
    && edge.targetPortId === 'exec'
  ));
  return incoming[0]?.sourceNodeId;
}

function controlSuccessor(workflow: Workflow, nodeId: string): string | undefined {
  const outgoing = workflow.edges.filter((edge) => (
    isControlEdge(workflow, edge)
    && edge.sourceNodeId === nodeId
    && edge.sourcePortId === 'execOut'
  ));
  return outgoing[0]?.targetNodeId;
}

export function planControlRun(
  workflow: Workflow | undefined,
  selectedNodeId: string | undefined,
): ControlRunPlan {
  if (!workflow || !selectedNodeId) {
    return { ok: false, reason: '请先选中一个带「执行」口的节点。' };
  }

  const selected = workflow.nodes.find((node) => node.id === selectedNodeId);
  if (!selected) {
    return { ok: false, reason: '选中节点不存在' };
  }

  if (!hasControlPorts(selected)) {
    if (selected.kind === 'cardVariable') {
      return { ok: false, reason: '卡片变量不在控制流上，请选带「执行」口的节点。' };
    }
    const label = lookupNodeDefinition(selected.kind)?.label ?? selected.kind;
    return { ok: false, reason: `「${label}」是旁支，不进控制流。` };
  }

  const visitedBack = new Set<string>([selected.id]);
  const ancestors: string[] = [];
  let cursor: string | undefined = selected.id;
  while (true) {
    const previous = controlPredecessor(workflow, cursor);
    if (!previous) break;
    if (visitedBack.has(previous)) {
      return { ok: false, reason: '工作流不能形成环路' };
    }
    visitedBack.add(previous);
    ancestors.push(previous);
    cursor = previous;
  }
  ancestors.reverse();

  const chain = [...ancestors, selected.id];
  const visitedForward = new Set<string>(chain);
  cursor = selected.id;
  while (true) {
    const next = controlSuccessor(workflow, cursor);
    if (!next) break;
    if (visitedForward.has(next)) {
      return { ok: false, reason: '工作流不能形成环路' };
    }
    visitedForward.add(next);
    chain.push(next);
    cursor = next;
  }

  const selectedIndex = chain.indexOf(selected.id);
  const nodeIds = chain.slice(selectedIndex);

  return {
    ok: true,
    nodeIds,
    rootId: chain[chain.length - 1]!,
  };
}
