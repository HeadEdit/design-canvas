import type { ChatSession } from '../../domain/model';
import {
  activeConversation,
  activeConversationMessages,
  appendCompletedQa,
  buildChatTextStructOutput,
  completeQaTurns,
} from '../../domain/chat-conversations';
import { NO_CHAT_SKILL } from '../../domain/chat-turns';
import { textInputValues } from '../../domain/workflow-io';
import type { RunChatInput, RunChatResult } from '../../execution/run-chat';
import { runChat as productionRunChat } from '../../execution/run-chat';
import type { NodeEffectContribution, NodeHostCapabilities } from '../types';
import { chatConfigSchema, type ChatConfig } from './config';

export interface ChatRuntime {
  runChat(input: RunChatInput): Promise<RunChatResult>;
  id(): string;
  now(): string;
}

let runtime: ChatRuntime = {
  runChat: (input) => productionRunChat(input, {
    getClient: () => undefined,
    id: () => crypto.randomUUID(),
    now: () => new Date().toISOString(),
  }),
  id: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
};

export function bindChatRuntime(next: ChatRuntime): void {
  runtime = next;
}

const chatOps = new Map<string, AbortController>();

function skillIdOf(config: ChatConfig): string {
  return config.skillId === NO_CHAT_SKILL ? '' : config.skillId;
}

function withRecordedQa(session: ChatSession): ChatSession {
  const conversation = activeConversation(session);
  if (!conversation) return session;
  const turns = completeQaTurns(activeConversationMessages(session));
  if (turns.length <= conversation.itemIds.length) return session;
  const missing = turns.slice(conversation.itemIds.length);
  return missing.reduce(
    (current, turn) => appendCompletedQa(
      current,
      current.activeConversationId,
      turn[0]!.content,
      turn[1]!.content,
      { id: () => runtime.id(), now: () => runtime.now() },
    ),
    session,
  );
}

export const chatEffects: NodeEffectContribution<ChatConfig> = {
  session: {
    async send(nodeId, text, capabilities) {
      const workflow = capabilities.workflow.getWorkflow();
      const node = capabilities.workflow.getNode(nodeId);
      const parsed = chatConfigSchema.safeParse(node?.config);
      if (!workflow || !node || !parsed.success) {
        return;
      }
      const existing = capabilities.sessions.getSession(nodeId);
      const controller = capabilities.sessions.beginTurn(nodeId, text, skillIdOf(parsed.data));
      chatOps.set(nodeId, controller);
      const texts = textInputValues(workflow, nodeId, 'text', {
        cards: capabilities.cards.listCards(),
      });
      try {
        const result = await runtime.runChat({
          workflowId: workflow.id,
          nodeId,
          skillId: skillIdOf(parsed.data),
          session: existing,
          question: text,
          referencedCards: [],
          referencedText: texts.length > 0 ? texts.join('\n\n') : undefined,
          signal: controller.signal,
        });
        if (chatOps.get(nodeId) !== controller) {
          return;
        }
        if (result.status === 'succeeded' && result.session) {
          const next = withRecordedQa(result.session);
          capabilities.sessions.completeTurn(nodeId, next);
          capabilities.workflow.commitNodeOutput(
            nodeId,
            buildChatTextStructOutput(next),
            'succeeded',
          );
          return;
        }
        capabilities.sessions.failTurn(nodeId, result.status === 'stopped' ? 'stopped' : 'failed');
      } finally {
        if (chatOps.get(nodeId) === controller) {
          chatOps.delete(nodeId);
        }
      }
    },
    stop(nodeId) {
      const controller = chatOps.get(nodeId);
      controller?.abort();
      chatOps.delete(nodeId);
    },
    removeTurns(nodeId, turnIndexes, capabilities) {
      capabilities.sessions.removeTurns(nodeId, turnIndexes);
    },
  },
};
