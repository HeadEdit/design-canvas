import type { AiClient } from '../ai/client';
import {
  activeConversationMessages,
  buildChatTextStructOutput,
  createChatSession,
  deleteConversation as deleteChatConversation,
  exportConversationTurn,
  forkFullContextConversation,
  forkSingleTurnConversation,
  omitConversationTurns,
  renameConversation as renameChatConversation,
  setActiveConversation as setActiveChatConversation,
  unexportConversationItem,
  updateItemTitle as updateChatItemTitle,
  withActiveConversationMessages,
} from '../domain/chat-conversations';
import { ensureChatSessionShape } from '../domain/chat-session-migrate';
import type {
  CandidateCard,
  CardScore,
  ChatBranchMode,
  ChatSession,
  NodeDisplayStatus,
  NodeOutput,
  NodeRun,
  Workflow,
  WorkflowNode,
} from '../domain/model';
import { markDescendantsStale } from '../domain/graph';
import { cardCollectionInputIds } from '../domain/workflow-io';
import type { ConfigPatchOptions, ConfigPatchResult, NodeHostCapabilities } from '../nodes/types';

export interface NodeHostCapabilityAdapters {
  getWorkflow(): Workflow | undefined;
  getCards(): readonly CandidateCard[];
  getRuns(): readonly NodeRun[];
  getSessions(): readonly ChatSession[];
  setSessions(sessions: ChatSession[]): void;
  validateConfigPatch(nodeId: string, patch: unknown): ConfigPatchResult;
  patchConfig(nodeId: string, patch: unknown, options?: ConfigPatchOptions): ConfigPatchResult;
  updateWorkflow(updater: (workflow: Workflow) => Workflow): void;
  rerunNode(nodeId: string): Promise<void>;
  stopNode(nodeId: string): void;
  toggleVote(cardId: string, vote: 'up' | 'down'): void;
  updateCard(
    cardId: string,
    patch: Partial<Pick<CandidateCard, 'title' | 'concept' | 'content' | 'tags'>>,
  ): void;
  deleteCard(variableNodeId: string, cardId: string): void;
  applyScores(updates: { cardId: string; score: CardScore }[]): void;
  sendChat(nodeId: string, text: string): Promise<void>;
  stopChat(nodeId: string): void;
  setChatSkill(nodeId: string, skillId: string): void;
  editChatLastMessage(nodeId: string, turnIndex: number, text: string): Promise<void>;
  isExecutionAvailable(): boolean;
  getAiClient(): AiClient | undefined;
  createAbortController(): AbortController;
  id(): string;
  now(): string;
  markDirty(): void;
  chatOps: Map<string, AbortController>;
  setPendingCardReplacement(value: {
    removed: readonly string[];
    installed: readonly CandidateCard[];
  }): void;
}

function boundCardCollectionSource(
  workflow: Workflow | undefined,
  consumerNodeId: string,
  inputPortId: string,
): WorkflowNode | undefined {
  const edge = workflow?.edges.find((item) => (
    item.targetNodeId === consumerNodeId && item.targetPortId === inputPortId
  ));
  if (!edge) return undefined;
  const source = workflow?.nodes.find((item) => item.id === edge.sourceNodeId);
  if (!source || source.output?.type !== 'CardCollection') return undefined;
  return source;
}

function appendUnique(existing: readonly string[], incoming: readonly string[]): string[] {
  const next = [...existing];
  const seen = new Set(existing);
  for (const id of incoming) {
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

function pooledCardIds(workflow: Workflow | undefined, removedNodeIds: readonly string[]): Set<string> {
  const removed = new Set(removedNodeIds);
  const pooled = new Set<string>();
  for (const node of workflow?.nodes ?? []) {
    if (removed.has(node.id) || node.kind !== 'cardVariable') continue;
    if (node.output?.type !== 'CardCollection') continue;
    for (const id of node.output.cardIds) pooled.add(id);
  }
  return pooled;
}

function commitBoundCollection(
  adapters: NodeHostCapabilityAdapters,
  consumerNodeId: string,
  inputPortId: string,
  nextCardIds: (current: readonly string[]) => string[],
): void {
  const source = boundCardCollectionSource(
    adapters.getWorkflow(),
    consumerNodeId,
    inputPortId,
  );
  if (!source || source.output?.type !== 'CardCollection') return;
  const cardIds = nextCardIds(source.output.cardIds);
  adapters.updateWorkflow((current) => markDescendantsStale({
    ...current,
    nodes: current.nodes.map((item) => item.id === source.id
      ? { ...item, output: { type: 'CardCollection', cardIds } }
      : item),
  }, source.id));
}

export function createNodeHostCapabilities(
  adapters: NodeHostCapabilityAdapters,
): NodeHostCapabilities {
  return {
    workflow: {
      getWorkflow: () => adapters.getWorkflow(),
      getNode: (nodeId) => adapters.getWorkflow()?.nodes.find((item) => item.id === nodeId),
      validateConfigPatch: (nodeId, patch) => adapters.validateConfigPatch(nodeId, patch),
      patchConfig: (nodeId, patch, options) => adapters.patchConfig(nodeId, patch, options),
      commitNodeOutput: (nodeId, output: NodeOutput, status?: NodeDisplayStatus) => {
        adapters.updateWorkflow((current) => ({
          ...current,
          nodes: current.nodes.map((item) => item.id === nodeId
            ? { ...item, output, ...(status ? { status } : {}) }
            : item),
        }));
      },
    },
    execution: {
      isAvailable: () => adapters.isExecutionAvailable(),
      rerunNode: (nodeId) => adapters.rerunNode(nodeId),
      stopNode: (nodeId) => adapters.stopNode(nodeId),
      rerunUpstream: async (nodeId, inputPortId) => {
        const workflow = adapters.getWorkflow();
        const edge = workflow?.edges.find((item) => (
          item.targetNodeId === nodeId && item.targetPortId === inputPortId
        ));
        if (edge) await adapters.rerunNode(edge.sourceNodeId);
      },
    },
    cards: {
      listCards: () => adapters.getCards(),
      getCard: (cardId) => adapters.getCards().find((card) => card.id === cardId),
      isCardAllowed: (nodeId, portId, cardId) => (
        cardCollectionInputIds(adapters.getWorkflow(), nodeId, portId).includes(cardId)
      ),
      replaceProducedCards: (_producerNodeId, removedCardIds, installed) => {
        adapters.setPendingCardReplacement({ removed: removedCardIds, installed });
      },
      toggleVote: (cardId, vote) => adapters.toggleVote(cardId, vote),
      updateCard: (cardId, patch) => adapters.updateCard(cardId, patch),
      deleteCard: (variableNodeId, cardId) => adapters.deleteCard(variableNodeId, cardId),
      applyScores: (updates) => adapters.applyScores(updates),
      collectOrphanedCardIds: (removedNodeIds) => {
        const pooled = pooledCardIds(adapters.getWorkflow(), removedNodeIds);
        return adapters.getCards().filter((card) => !pooled.has(card.id)).map((card) => card.id);
      },
      appendToBoundCollection: (consumerNodeId, inputPortId, cardIds) => {
        commitBoundCollection(adapters, consumerNodeId, inputPortId, (current) => (
          appendUnique(current, cardIds)
        ));
      },
      reorderBoundCollection: (consumerNodeId, inputPortId, cardIds) => {
        commitBoundCollection(adapters, consumerNodeId, inputPortId, () => [...cardIds]);
      },
    },
    sessions: {
      getSession: (nodeId) => {
        const workflow = adapters.getWorkflow();
        const found = adapters.getSessions().find((session) => (
          session.workflowId === workflow?.id && session.nodeId === nodeId
        ));
        return found ? ensureChatSessionShape(found) : undefined;
      },
      send: (nodeId, text) => adapters.sendChat(nodeId, text),
      stop: (nodeId) => adapters.stopChat(nodeId),
      setSkill: (nodeId, skillId) => adapters.setChatSkill(nodeId, skillId),
      editLastMessage: (nodeId, turnIndex, text) => adapters.editChatLastMessage(nodeId, turnIndex, text),
      beginTurn: (nodeId, question, skillId) => {
        adapters.chatOps.get(nodeId)?.abort();
        const controller = adapters.createAbortController();
        adapters.chatOps.set(nodeId, controller);
        const workflow = adapters.getWorkflow();
        if (!workflow) return controller;
        adapters.updateWorkflow((current) => ({
          ...current,
          nodes: current.nodes.map((item): WorkflowNode => item.id === nodeId
            ? { ...item, status: 'running' }
            : item),
        }));
        const existing = adapters.getSessions().find((session) => (
          session.workflowId === workflow.id && session.nodeId === nodeId
        ));
        const optimisticAt = adapters.now();
        const shaped = existing
          ? ensureChatSessionShape(existing)
          : createChatSession({
            id: adapters.id(),
            workflowId: workflow.id,
            nodeId,
            skillId,
            createdAt: optimisticAt,
            updatedAt: optimisticAt,
            conversationId: adapters.id(),
          });
        const history = activeConversationMessages(shaped).filter((message) => message.role !== 'system');
        const optimisticSession: ChatSession = {
          ...withActiveConversationMessages(
            shaped,
            [...history, { role: 'user', content: question.trim() }],
            optimisticAt,
          ),
          skillId,
        };
        adapters.setSessions([
          ...adapters.getSessions().filter((item) => !(item.workflowId === workflow.id && item.nodeId === nodeId)),
          optimisticSession,
        ]);
        adapters.markDirty();
        return controller;
      },
      completeTurn: (nodeId, session) => {
        const workflow = adapters.getWorkflow();
        if (!workflow) return;
        adapters.setSessions([
          ...adapters.getSessions().filter((item) => !(item.workflowId === workflow.id && item.nodeId === nodeId)),
          session,
        ]);
        adapters.markDirty();
      },
      failTurn: (nodeId, status) => {
        adapters.updateWorkflow((current) => ({
          ...current,
          nodes: current.nodes.map((item) => item.id === nodeId
            ? { ...item, status }
            : item),
        }));
      },
      removeTurns: (nodeId, turnIndexes) => {
        const workflow = adapters.getWorkflow();
        if (!workflow) return;
        const existing = adapters.getSessions().find((session) => (
          session.workflowId === workflow.id && session.nodeId === nodeId
        ));
        if (!existing) return;
        const shaped = ensureChatSessionShape(existing);
        const nextSession = omitConversationTurns(
          shaped,
          shaped.activeConversationId,
          turnIndexes,
          adapters.now(),
        );
        adapters.setSessions([
          ...adapters.getSessions().filter((item) => !(item.workflowId === workflow.id && item.nodeId === nodeId)),
          nextSession,
        ]);
        adapters.updateWorkflow((current) => ({
          ...current,
          nodes: current.nodes.map((item) => (
            item.id === nodeId
              ? { ...item, output: buildChatTextStructOutput(nextSession) }
              : item
          )),
        }));
        adapters.markDirty();
      },
      purgeSessions: (removedNodeIds, removedCardIds) => {
        const removed = new Set(removedNodeIds);
        const removedCards = new Set(removedCardIds);
        return adapters.getSessions().filter((session) => (
          !removed.has(session.nodeId)
          && !session.referencedCardIds.some((cardId) => removedCards.has(cardId))
        ));
      },
      setActiveConversation: (nodeId, conversationId) => {
        const workflow = adapters.getWorkflow();
        if (!workflow) return;
        const existing = adapters.getSessions().find((session) => (
          session.workflowId === workflow.id && session.nodeId === nodeId
        ));
        if (!existing) return;
        const next = setActiveChatConversation(
          ensureChatSessionShape(existing),
          conversationId,
          adapters.now(),
        );
        adapters.setSessions([
          ...adapters.getSessions().filter((item) => !(item.workflowId === workflow.id && item.nodeId === nodeId)),
          next,
        ]);
        adapters.markDirty();
      },
      renameConversation: (nodeId, conversationId, name) => {
        const workflow = adapters.getWorkflow();
        if (!workflow) return;
        const existing = adapters.getSessions().find((session) => (
          session.workflowId === workflow.id && session.nodeId === nodeId
        ));
        if (!existing) return;
        const next = renameChatConversation(
          ensureChatSessionShape(existing),
          conversationId,
          name,
          adapters.now(),
        );
        adapters.setSessions([
          ...adapters.getSessions().filter((item) => !(item.workflowId === workflow.id && item.nodeId === nodeId)),
          next,
        ]);
        adapters.updateWorkflow((current) => ({
          ...current,
          nodes: current.nodes.map((item) => (
            item.id === nodeId
              ? { ...item, output: buildChatTextStructOutput(next) }
              : item
          )),
        }));
        adapters.markDirty();
      },
      deleteConversation: (nodeId, conversationId) => {
        const workflow = adapters.getWorkflow();
        if (!workflow) return;
        const existing = adapters.getSessions().find((session) => (
          session.workflowId === workflow.id && session.nodeId === nodeId
        ));
        if (!existing) return;
        const next = deleteChatConversation(
          ensureChatSessionShape(existing),
          conversationId,
          adapters.now(),
        );
        adapters.setSessions([
          ...adapters.getSessions().filter((item) => !(item.workflowId === workflow.id && item.nodeId === nodeId)),
          next,
        ]);
        adapters.updateWorkflow((current) => ({
          ...current,
          nodes: current.nodes.map((item) => (
            item.id === nodeId
              ? { ...item, output: buildChatTextStructOutput(next) }
              : item
          )),
        }));
        adapters.markDirty();
      },
      forkConversation: (nodeId, mode: ChatBranchMode, conversationId, itemId) => {
        const workflow = adapters.getWorkflow();
        if (!workflow) return { error: 'missing-workflow' };
        const node = workflow.nodes.find((item) => item.id === nodeId);
        if (!node) return { error: 'missing-node' };
        if (mode === 'single-turn' && node.status === 'running') {
          return { error: 'busy' };
        }
        const existing = adapters.getSessions().find((session) => (
          session.workflowId === workflow.id && session.nodeId === nodeId
        ));
        if (!existing) return { error: 'missing-session' };
        const shaped = ensureChatSessionShape(existing);
        const clock = { id: () => adapters.id(), now: () => adapters.now() };
        if (mode === 'full-context') {
          const next = forkFullContextConversation(shaped, conversationId, itemId, clock);
          adapters.setSessions([
            ...adapters.getSessions().filter((item) => !(item.workflowId === workflow.id && item.nodeId === nodeId)),
            next,
          ]);
          adapters.updateWorkflow((current) => ({
            ...current,
            nodes: current.nodes.map((item) => (
              item.id === nodeId
                ? { ...item, output: buildChatTextStructOutput(next) }
                : item
            )),
          }));
          adapters.markDirty();
          return { conversationId: next.activeConversationId };
        }
        const forked = forkSingleTurnConversation(shaped, conversationId, itemId, clock);
        if (!forked.seedUserText) return { error: 'missing-item' };
        adapters.setSessions([
          ...adapters.getSessions().filter((item) => !(item.workflowId === workflow.id && item.nodeId === nodeId)),
          forked.session,
        ]);
        adapters.updateWorkflow((current) => ({
          ...current,
          nodes: current.nodes.map((item) => (
            item.id === nodeId
              ? { ...item, output: buildChatTextStructOutput(forked.session) }
              : item
          )),
        }));
        adapters.markDirty();
        return { conversationId: forked.session.activeConversationId };
      },
      exportTurn: (nodeId, conversationId, itemId) => {
        const workflow = adapters.getWorkflow();
        if (!workflow) return;
        const existing = adapters.getSessions().find((session) => (
          session.workflowId === workflow.id && session.nodeId === nodeId
        ));
        if (!existing) return;
        const next = exportConversationTurn(
          ensureChatSessionShape(existing),
          conversationId,
          itemId,
          adapters.now(),
        );
        adapters.setSessions([
          ...adapters.getSessions().filter((item) => !(item.workflowId === workflow.id && item.nodeId === nodeId)),
          next,
        ]);
        adapters.updateWorkflow((current) => ({
          ...current,
          nodes: current.nodes.map((item) => (
            item.id === nodeId
              ? { ...item, output: buildChatTextStructOutput(next) }
              : item
          )),
        }));
        adapters.markDirty();
      },
      unexportItem: (nodeId, itemId) => {
        const workflow = adapters.getWorkflow();
        if (!workflow) return;
        const existing = adapters.getSessions().find((session) => (
          session.workflowId === workflow.id && session.nodeId === nodeId
        ));
        if (!existing) return;
        const next = unexportConversationItem(
          ensureChatSessionShape(existing),
          itemId,
          adapters.now(),
        );
        adapters.setSessions([
          ...adapters.getSessions().filter((item) => !(item.workflowId === workflow.id && item.nodeId === nodeId)),
          next,
        ]);
        adapters.updateWorkflow((current) => ({
          ...current,
          nodes: current.nodes.map((item) => (
            item.id === nodeId
              ? { ...item, output: buildChatTextStructOutput(next) }
              : item
          )),
        }));
        adapters.markDirty();
      },
      updateItemTitle: (nodeId, itemId, title) => {
        const workflow = adapters.getWorkflow();
        if (!workflow) return;
        const existing = adapters.getSessions().find((session) => (
          session.workflowId === workflow.id && session.nodeId === nodeId
        ));
        if (!existing) return;
        const next = updateChatItemTitle(
          ensureChatSessionShape(existing),
          itemId,
          title,
          adapters.now(),
        );
        adapters.setSessions([
          ...adapters.getSessions().filter((item) => !(item.workflowId === workflow.id && item.nodeId === nodeId)),
          next,
        ]);
        adapters.updateWorkflow((current) => ({
          ...current,
          nodes: current.nodes.map((item) => (
            item.id === nodeId
              ? { ...item, output: buildChatTextStructOutput(next) }
              : item
          )),
        }));
        adapters.markDirty();
      },
    },
    ai: {
      isConfigured: () => adapters.isExecutionAvailable(),
      getClient: () => adapters.getAiClient(),
    },
  };
}
