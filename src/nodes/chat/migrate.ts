import { canConnectPortTypes, getPort } from '../../domain/node-definitions';
import type { Workflow } from '../../domain/model';

export function dropIncompatiblePortEdges(workflow: Workflow): Workflow {
  const edges = workflow.edges.filter((edge) => {
    const sourceNode = workflow.nodes.find((node) => node.id === edge.sourceNodeId);
    const targetNode = workflow.nodes.find((node) => node.id === edge.targetNodeId);
    if (!sourceNode || !targetNode) return true;
    const sourcePort = getPort(sourceNode.kind, 'output', edge.sourcePortId);
    const targetPort = getPort(targetNode.kind, 'input', edge.targetPortId);
    if (!sourcePort || !targetPort) return true;
    return canConnectPortTypes(sourcePort.type, targetPort.type);
  });
  return edges.length === workflow.edges.length ? workflow : { ...workflow, edges };
}

export function rewriteRetiredChatSelectionEdges(workflow: Workflow): Workflow {
  let changed = false;
  const edges = workflow.edges.map((edge) => {
    const target = workflow.nodes.find((node) => node.id === edge.targetNodeId);
    if (target?.kind !== 'chat' || edge.targetPortId !== 'selection') {
      return edge;
    }
    changed = true;
    return { ...edge, targetPortId: 'text' };
  });
  const rewritten = changed ? { ...workflow, edges } : workflow;
  return dropIncompatiblePortEdges(rewritten);
}
