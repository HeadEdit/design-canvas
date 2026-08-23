import {
  canConnectPortTypes,
  lookupNodeDefinition,
  type NodeDefinition,
  type NodePort,
} from './node-definitions';
import { formatCandidateCardText } from './card-text';
import { isControlEdge } from './control-flow';
import type {
  CandidateCard,
  NodeOutput,
  PortDataType,
  TextStructItem,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from './model';
import { requireCardVariableSource } from './require-card-variable-source';

export type WorkflowInputFailureReason =
  | 'target-node-not-found'
  | 'target-port-not-found'
  | 'input-edge-not-found'
  | 'source-node-not-found'
  | 'source-port-not-found'
  | 'port-type-mismatch'
  | 'source-output-missing'
  | 'output-type-mismatch';

export interface WorkflowInputResolverDependencies {
  getNodeDefinition?(kind: string): NodeDefinition | undefined;
  cards?: readonly CandidateCard[];
}

export interface ResolvedNodeInput {
  readonly edge: WorkflowEdge;
  readonly sourceNode: WorkflowNode;
  readonly sourcePort: NodePort;
  readonly targetPort: NodePort;
  readonly output: NodeOutput;
}

export type ResolveNodeInputResult =
  | { readonly ok: true; readonly value: ResolvedNodeInput }
  | { readonly ok: false; readonly reason: WorkflowInputFailureReason };

const productionGetNodeDefinition = (kind: string): NodeDefinition | undefined => (
  lookupNodeDefinition(kind)
);

function resolveDependencies(
  dependencies?: WorkflowInputResolverDependencies,
): Required<Pick<WorkflowInputResolverDependencies, 'getNodeDefinition'>>
  & Pick<WorkflowInputResolverDependencies, 'cards'> {
  return {
    getNodeDefinition: dependencies?.getNodeDefinition ?? productionGetNodeDefinition,
    cards: dependencies?.cards,
  };
}

export function resolveNodeInput(
  workflow: Workflow,
  targetNodeId: string,
  targetPortId: string,
  dependencies?: WorkflowInputResolverDependencies,
): ResolveNodeInputResult {
  const all = resolveAllNodeInputs(workflow, targetNodeId, targetPortId, dependencies);
  if (all.length === 0) {
    const targetNode = workflow.nodes.find((node) => node.id === targetNodeId);
    if (!targetNode) return { ok: false, reason: 'target-node-not-found' };
    const deps = resolveDependencies(dependencies);
    const targetDefinition = deps.getNodeDefinition(targetNode.kind);
    const targetPort = targetDefinition?.inputs.find((port) => port.id === targetPortId);
    if (!targetPort) return { ok: false, reason: 'target-port-not-found' };
    return { ok: false, reason: 'input-edge-not-found' };
  }
  return all[0]!;
}

export function resolveAllNodeInputs(
  workflow: Workflow,
  targetNodeId: string,
  targetPortId: string,
  dependencies?: WorkflowInputResolverDependencies,
): ResolveNodeInputResult[] {
  const deps = resolveDependencies(dependencies);
  const targetNode = workflow.nodes.find((node) => node.id === targetNodeId);
  if (!targetNode) return [{ ok: false, reason: 'target-node-not-found' }];

  const targetDefinition = deps.getNodeDefinition(targetNode.kind);
  const targetPort = targetDefinition?.inputs.find(
    (port) => port.id === targetPortId,
  );
  if (!targetPort) return [{ ok: false, reason: 'target-port-not-found' }];
  if (targetPort.type === 'Control') return [];

  const edges = workflow.edges.filter(
    (item) => item.targetNodeId === targetNodeId
      && item.targetPortId === targetPortId
      && !isControlEdge(workflow, item),
  );
  if (edges.length === 0) return [];

  return edges.map((edge) => resolveEdge(workflow, edge, targetPort, deps));
}

function resolveEdge(
  workflow: Workflow,
  edge: WorkflowEdge,
  targetPort: NodePort,
  dependencies: ReturnType<typeof resolveDependencies>,
): ResolveNodeInputResult {
  const sourceNode = workflow.nodes.find(
    (node) => node.id === edge.sourceNodeId,
  );
  if (!sourceNode) return { ok: false, reason: 'source-node-not-found' };

  const sourceDefinition = dependencies.getNodeDefinition(sourceNode.kind);
  const sourcePort = sourceDefinition?.outputs.find(
    (port) => port.id === edge.sourcePortId,
  );
  if (!sourcePort) return { ok: false, reason: 'source-port-not-found' };
  if (!canConnectPortTypes(sourcePort.type, targetPort.type)) {
    return { ok: false, reason: 'port-type-mismatch' };
  }
  if (!sourceNode.output) {
    return { ok: false, reason: 'source-output-missing' };
  }
  if (sourceNode.output.type !== sourcePort.type) {
    return { ok: false, reason: 'output-type-mismatch' };
  }
  return {
    ok: true,
    value: {
      edge,
      sourceNode,
      sourcePort,
      targetPort,
      output: coerceOutputToPortType(
        sourceNode.output,
        targetPort.type,
        dependencies.cards ?? [],
      ),
    },
  };
}

export function coerceOutputToPortType(
  output: NodeOutput,
  targetType: PortDataType,
  cards: readonly CandidateCard[],
): NodeOutput {
  if (output.type === targetType) {
    return structuredClone(output);
  }
  if (targetType === 'TextStruct') {
    return output;
  }
  const texts = outputAsPlainTexts(output, cards);
  if (targetType === 'Text[]') {
    return { type: 'Text[]', values: texts };
  }
  if (targetType === 'Text') {
    return { type: 'Text', value: texts.join('\n\n') };
  }
  return output;
}

function outputAsPlainTexts(
  output: NodeOutput,
  cards: readonly CandidateCard[],
): string[] {
  switch (output.type) {
    case 'Text':
      return output.value.trim() ? [output.value] : [];
    case 'Text[]':
      return output.values.filter((value) => value.trim());
    case 'CardCollection': {
      const byId = new Map(cards.map((card) => [card.id, card]));
      return output.cardIds.flatMap((id) => {
        const card = byId.get(id);
        return card ? [formatCandidateCardText(card)] : [];
      });
    }
    case 'TextStruct':
      return output.items.map((item) => item.content).filter((value) => value.trim());
  }
}

function collectedTextValues(output: NodeOutput): string[] {
  if (output.type === 'Text') {
    return output.value.trim() ? [output.value] : [];
  }
  if (output.type === 'Text[]') {
    return output.values.filter((value) => value.trim());
  }
  return [];
}

export function textInputValues(
  workflow: Workflow | undefined,
  targetNodeId: string,
  targetPortId: string,
  dependencies?: WorkflowInputResolverDependencies,
): string[] {
  if (!workflow) return [];
  return resolveAllNodeInputs(workflow, targetNodeId, targetPortId, dependencies)
    .flatMap((result) => (
      result.ok ? collectedTextValues(result.value.output) : []
    ));
}

export function cardCollectionInputIds(
  workflow: Workflow | undefined,
  targetNodeId: string,
  targetPortId = 'cards',
  dependencies?: WorkflowInputResolverDependencies,
): string[] {
  if (!workflow) return [];
  const result = resolveNodeInput(
    workflow,
    targetNodeId,
    targetPortId,
    dependencies,
  );
  return result.ok && result.value.output.type === 'CardCollection'
    ? [...result.value.output.cardIds]
    : [];
}

export function textStructInput(
  workflow: Workflow | undefined,
  targetNodeId: string,
  targetPortId: string,
  dependencies?: WorkflowInputResolverDependencies,
): TextStructItem[] {
  if (!workflow) return [];
  const result = resolveNodeInput(workflow, targetNodeId, targetPortId, dependencies);
  return result.ok && result.value.output.type === 'TextStruct'
    ? [...result.value.output.items]
    : [];
}

export function findPeerIdeaScoreNode(
  workflow: Workflow | undefined,
  nodeId: string,
  portId = 'cards',
): WorkflowNode | undefined {
  if (!workflow) return undefined;
  const binding = requireCardVariableSource(workflow, nodeId, portId);
  if (!binding.ok) return undefined;
  return findIdeaScoreNodeForVariable(workflow, binding.source.id);
}

export function variablePoolCardIds(
  workflow: Workflow | undefined,
  variableNodeId: string,
): string[] {
  const node = workflow?.nodes.find((item) => item.id === variableNodeId);
  if (!node || node.kind !== 'cardVariable' || node.output?.type !== 'CardCollection') {
    return [];
  }
  return [...node.output.cardIds];
}

export function findIdeaScoreNodeForVariable(
  workflow: Workflow | undefined,
  variableNodeId: string,
): WorkflowNode | undefined {
  if (!workflow) return undefined;
  let found: WorkflowNode | undefined;
  for (const node of workflow.nodes) {
    if (node.kind !== 'ideaScore') continue;
    const peer = requireCardVariableSource(workflow, node.id, 'cards');
    if (peer.ok && peer.source.id === variableNodeId) {
      found = node;
    }
  }
  return found;
}
