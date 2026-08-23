import { canConnectPortTypes, getPort } from '../../domain/node-definitions';
import type { CandidateCard, Workflow, WorkflowEdge, WorkflowNode } from '../../domain/model';
import { isRecord } from '../../schema/common';

const LEGACY_KINDS = new Set(['divergence', 'ideaScore', 'cardBrowser']);
const RETIRED_CARDS_PORT = 'cards';
const VARIABLE_OFFSET_X = 280;
const VARIABLE_NAME_MAX = 24;
const DEFAULT_VARIABLE_NAME = '卡片池';

export interface MigrateLegacyCardVariableOptions {
  id?: () => string;
}

function sourcePortMissing(edge: WorkflowEdge, nodesById: Map<string, WorkflowNode>): boolean {
  const source = nodesById.get(edge.sourceNodeId);
  return !source || !getPort(source.kind, 'output', edge.sourcePortId);
}

function isRetiredCardsEdge(edge: WorkflowEdge, nodesById: Map<string, WorkflowNode>): boolean {
  return edge.sourcePortId === RETIRED_CARDS_PORT && sourcePortMissing(edge, nodesById);
}

function isLegacyHolder(
  node: WorkflowNode,
  edges: readonly WorkflowEdge[],
  nodesById: Map<string, WorkflowNode>,
): boolean {
  if (!LEGACY_KINDS.has(node.kind)) return false;
  if (node.output?.type === 'CardCollection') return true;
  return edges.some((edge) => (
    isRetiredCardsEdge(edge, nodesById)
    && (edge.sourceNodeId === node.id || edge.targetNodeId === node.id)
  ));
}

function consumerPortId(kind: string): string | undefined {
  if (kind === 'divergence') return 'pool';
  if (kind === 'ideaScore' || kind === 'cardBrowser') return 'cards';
  return undefined;
}

function poolCardIds(node: WorkflowNode): string[] {
  return node.output?.type === 'CardCollection' ? [...node.output.cardIds] : [];
}

function pickUpstream(cluster: readonly WorkflowNode[]): WorkflowNode {
  return cluster.find((item) => item.kind === 'divergence')
    ?? cluster.find((item) => item.kind === 'ideaScore')
    ?? cluster.find((item) => item.kind === 'cardBrowser')
    ?? cluster[0]!;
}

function variableNameFor(cluster: readonly WorkflowNode[]): string {
  const divergence = cluster.find((item) => item.kind === 'divergence');
  if (!divergence || !isRecord(divergence.config)) return DEFAULT_VARIABLE_NAME;
  const requirement = divergence.config.requirement;
  if (typeof requirement !== 'string') return DEFAULT_VARIABLE_NAME;
  const trimmed = requirement.trim();
  if (!trimmed) return DEFAULT_VARIABLE_NAME;
  if (trimmed.length <= VARIABLE_NAME_MAX) return trimmed;
  return `${trimmed.slice(0, VARIABLE_NAME_MAX)}…`;
}

function findRoot(parent: Map<string, string>, id: string): string {
  let root = id;
  while (parent.get(root) !== root) {
    root = parent.get(root)!;
  }
  let current = id;
  while (current !== root) {
    const next = parent.get(current)!;
    parent.set(current, root);
    current = next;
  }
  return root;
}

function clusterHolders(
  holders: readonly WorkflowNode[],
  edges: readonly WorkflowEdge[],
): WorkflowNode[][] {
  const holderIds = new Set(holders.map((item) => item.id));
  const parent = new Map(holders.map((item) => [item.id, item.id]));
  const union = (left: string, right: string) => {
    const leftRoot = findRoot(parent, left);
    const rightRoot = findRoot(parent, right);
    if (leftRoot !== rightRoot) parent.set(leftRoot, rightRoot);
  };

  for (const edge of edges) {
    if (!holderIds.has(edge.sourceNodeId) || !holderIds.has(edge.targetNodeId)) continue;
    if (edge.sourcePortId !== RETIRED_CARDS_PORT) continue;
    union(edge.sourceNodeId, edge.targetNodeId);
  }

  const groups = new Map<string, WorkflowNode[]>();
  for (const holder of holders) {
    const root = findRoot(parent, holder.id);
    const list = groups.get(root) ?? [];
    list.push(holder);
    groups.set(root, list);
  }
  return [...groups.values()];
}

function canAcceptCardCollection(kind: string, portId: string): boolean {
  const port = getPort(kind, 'input', portId);
  return !!port && canConnectPortTypes('CardCollection', port.type);
}

function occupiesSingleInboundSlot(kind: string, portId: string): boolean {
  const port = getPort(kind, 'input', portId);
  return !!port && port.type !== 'Text[]';
}

export function migrateLegacyCardVariableGraph(
  workflow: Workflow,
  options: MigrateLegacyCardVariableOptions = {},
): Workflow {
  const nodesById = new Map(workflow.nodes.map((item) => [item.id, item]));
  const holders = workflow.nodes.filter((item) => isLegacyHolder(item, workflow.edges, nodesById));
  if (holders.length === 0) return workflow;

  const id = options.id ?? (() => crypto.randomUUID());
  const holderIds = new Set(holders.map((item) => item.id));
  const clusters = clusterHolders(holders, workflow.edges);
  const removedEdgeIds = new Set<string>();
  for (const edge of workflow.edges) {
    if (sourcePortMissing(edge, nodesById)) removedEdgeIds.add(edge.id);
  }
  for (const cluster of clusters) {
    const clusterIds = new Set(cluster.map((item) => item.id));
    for (const edge of workflow.edges) {
      if (clusterIds.has(edge.sourceNodeId) && edge.sourcePortId === RETIRED_CARDS_PORT) {
        removedEdgeIds.add(edge.id);
      }
    }
  }
  const occupied = new Set(
    workflow.edges
      .filter((item) => !removedEdgeIds.has(item.id))
      .filter((item) => {
        const target = nodesById.get(item.targetNodeId);
        return !!target && occupiesSingleInboundSlot(target.kind, item.targetPortId);
      })
      .map((item) => `${item.targetNodeId}:${item.targetPortId}`),
  );
  const createdNodes: WorkflowNode[] = [];
  const createdEdges: WorkflowEdge[] = [];

  for (const cluster of clusters) {
    const clusterIds = new Set(cluster.map((item) => item.id));
    const upstream = pickUpstream(cluster);
    const variableId = id();
    createdNodes.push({
      id: variableId,
      kind: 'cardVariable',
      position: {
        x: upstream.position.x - VARIABLE_OFFSET_X,
        y: upstream.position.y,
      },
      status: 'idle',
      config: { name: variableNameFor(cluster) },
      output: { type: 'CardCollection', cardIds: poolCardIds(upstream) },
    });

    const targets = new Map<string, { nodeId: string; portId: string }>();
    const addTarget = (nodeId: string, portId: string) => {
      const target = nodesById.get(nodeId);
      if (!target || !canAcceptCardCollection(target.kind, portId)) return;
      targets.set(`${nodeId}:${portId}`, { nodeId, portId });
    };

    for (const member of cluster) {
      const portId = consumerPortId(member.kind);
      if (portId) addTarget(member.id, portId);
    }

    for (const edge of workflow.edges) {
      if (!clusterIds.has(edge.sourceNodeId) || !removedEdgeIds.has(edge.id)) continue;
      const target = nodesById.get(edge.targetNodeId);
      if (!target || clusterIds.has(target.id)) continue;
      addTarget(target.id, edge.targetPortId);
    }

    for (const target of targets.values()) {
      const slot = `${target.nodeId}:${target.portId}`;
      if (occupied.has(slot)) continue;
      createdEdges.push({
        id: id(),
        sourceNodeId: variableId,
        sourcePortId: 'cards',
        targetNodeId: target.nodeId,
        targetPortId: target.portId,
      });
      const targetNode = nodesById.get(target.nodeId);
      if (targetNode && occupiesSingleInboundSlot(targetNode.kind, target.portId)) {
        occupied.add(slot);
      }
    }
  }

  return {
    ...workflow,
    nodes: [
      ...createdNodes,
      ...workflow.nodes.map((item) => (
        holderIds.has(item.id) ? { ...item, output: undefined } : item
      )),
    ],
    edges: [
      ...workflow.edges.filter((item) => !removedEdgeIds.has(item.id)),
      ...createdEdges,
    ],
  };
}

export function stripRetiredCardBrowserNodes(
  workflow: Workflow,
  options: MigrateLegacyCardVariableOptions = {},
): Workflow {
  const browsers = workflow.nodes.filter((item) => item.kind === 'cardBrowser');
  if (browsers.length === 0) return workflow;

  const id = options.id ?? (() => crypto.randomUUID());
  const browserIds = new Set(browsers.map((item) => item.id));
  const nodesById = new Map(workflow.nodes.map((item) => [item.id, item]));
  const removedEdgeIds = new Set<string>();
  const createdEdges: WorkflowEdge[] = [];
  const occupied = new Set(
    workflow.edges
      .filter((edge) => !browserIds.has(edge.sourceNodeId) && !browserIds.has(edge.targetNodeId))
      .filter((edge) => {
        const target = nodesById.get(edge.targetNodeId);
        return !!target && occupiesSingleInboundSlot(target.kind, edge.targetPortId);
      })
      .map((edge) => `${edge.targetNodeId}:${edge.targetPortId}`),
  );

  for (const browser of browsers) {
    const inbound = workflow.edges.find((edge) => (
      edge.targetNodeId === browser.id
      && edge.targetPortId === 'cards'
      && nodesById.get(edge.sourceNodeId)?.kind === 'cardVariable'
    ));
    const variableId = inbound?.sourceNodeId;

    for (const edge of workflow.edges) {
      if (edge.sourceNodeId !== browser.id) continue;
      removedEdgeIds.add(edge.id);
      if (!variableId) continue;

      const target = nodesById.get(edge.targetNodeId);
      if (!target || !canAcceptCardCollection(target.kind, edge.targetPortId)) continue;
      const slot = `${edge.targetNodeId}:${edge.targetPortId}`;
      if (occupied.has(slot)) continue;

      createdEdges.push({
        id: id(),
        sourceNodeId: variableId,
        sourcePortId: 'cards',
        targetNodeId: edge.targetNodeId,
        targetPortId: edge.targetPortId,
      });
      if (occupiesSingleInboundSlot(target.kind, edge.targetPortId)) {
        occupied.add(slot);
      }
    }

    for (const edge of workflow.edges) {
      if (edge.targetNodeId === browser.id || edge.sourceNodeId === browser.id) {
        removedEdgeIds.add(edge.id);
      }
    }
  }

  return {
    ...workflow,
    nodes: workflow.nodes.filter((item) => !browserIds.has(item.id)),
    edges: [
      ...workflow.edges.filter((item) => !removedEdgeIds.has(item.id)),
      ...createdEdges,
    ],
    containmentEdges: workflow.containmentEdges.filter((item) => (
      !browserIds.has(item.parentNodeId) && !browserIds.has(item.childNodeId)
    )),
  };
}

export function dropCardsOutsideVariablePools(
  workflow: Workflow,
  cards: readonly CandidateCard[],
): CandidateCard[] {
  const pooled = new Set<string>();
  for (const item of workflow.nodes) {
    if (item.kind !== 'cardVariable' || item.output?.type !== 'CardCollection') continue;
    for (const cardId of item.output.cardIds) pooled.add(cardId);
  }
  const next = cards.filter((card) => pooled.has(card.id));
  return next.length === cards.length ? cards as CandidateCard[] : next;
}
