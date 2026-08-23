import type { ChatMessage, ChatSession } from './model';
import {
  completeQaTurns,
  createChatSession,
  syncConversationItems,
  type ChatClock,
} from './chat-conversations';
import { fallbackTitle } from './text-struct';

export interface LegacyChatSession {
  id: string;
  workflowId: string;
  nodeId: string;
  skillId: string;
  referencedCardIds: string[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const defaultClock: ChatClock = {
  id: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
};

export function isMigratedChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<ChatSession>;
  return Array.isArray(session.conversations)
    && Array.isArray(session.items)
    && typeof session.activeConversationId === 'string';
}

export function migrateLegacyChatSession(
  legacy: LegacyChatSession,
  clock: ChatClock = defaultClock,
): ChatSession {
  const messages = legacy.messages.filter((message) => message.role !== 'system');
  const turns = completeQaTurns(messages);
  const turnIds = turns.map(() => clock.id());
  const firstQuestion = turns[0]?.[0]?.content;
  return createChatSession({
    id: legacy.id,
    workflowId: legacy.workflowId,
    nodeId: legacy.nodeId,
    skillId: legacy.skillId,
    referencedCardIds: legacy.referencedCardIds,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    conversationId: clock.id(),
    conversationName: firstQuestion ? fallbackTitle(firstQuestion) : undefined,
    messages,
    itemIds: turnIds,
  });
}

export function ensureChatSessionShape(
  session: ChatSession | LegacyChatSession,
  clock: ChatClock = defaultClock,
): ChatSession {
  if (isMigratedChatSession(session)) {
    return syncConversationItems(session);
  }
  return migrateLegacyChatSession(session as LegacyChatSession, clock);
}
