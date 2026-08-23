import type { AiClient } from '../ai/client';
import { AiClientError } from '../ai/client';
import { buildChatMessages } from '../ai/prompts';
import type { CandidateCard, ChatSession } from '../domain/model';
import {
  activeConversationMessages,
  createChatSession,
  withActiveConversationMessages,
} from '../domain/chat-conversations';
import { ensureChatSessionShape } from '../domain/chat-session-migrate';
import { getSkill } from '../skills';
import { NO_CHAT_SKILL } from '../domain/chat-turns';

export interface RunChatInput {
  workflowId: string;
  nodeId: string;
  skillId: string;
  session?: ChatSession;
  question: string;
  referencedCards: readonly CandidateCard[];
  referencedText?: string;
  signal: AbortSignal;
}

export interface RunChatResult {
  status: 'succeeded' | 'failed' | 'stopped';
  startedAt: string;
  finishedAt: string;
  errorKind?: string;
  session?: ChatSession;
}

export interface RunChatDependencies {
  getClient: () => AiClient | undefined;
  id: () => string;
  now: () => string;
}

function failed(
  startedAt: string,
  finishedAt: string,
  errorKind: string,
): RunChatResult {
  return { status: 'failed', startedAt, finishedAt, errorKind };
}

export async function runChat(
  input: RunChatInput,
  deps: RunChatDependencies,
): Promise<RunChatResult> {
  const startedAt = deps.now();
  const question = input.question.trim();

  if (input.signal.aborted) {
    return { status: 'stopped', startedAt, finishedAt: deps.now() };
  }

  if (!question) {
    return failed(startedAt, deps.now(), 'invalid-response');
  }

  const skillId = input.skillId.trim() === NO_CHAT_SKILL ? '' : input.skillId.trim();
  const skill = skillId ? getSkill(skillId) : undefined;
  if (skillId && (!skill || (skill.category !== 'role' && skill.category !== 'assistant'))) {
    return failed(startedAt, deps.now(), 'invalid-response');
  }

  const client = deps.getClient();
  if (!client) {
    return failed(startedAt, deps.now(), 'invalid-response');
  }

  const shaped = input.session ? ensureChatSessionShape(input.session) : undefined;
  const history = shaped ? activeConversationMessages(shaped) : [];
  const messages = buildChatMessages(
    skill,
    input.referencedCards,
    input.referencedText,
    history,
    question,
  );

  try {
    const reply = await client.complete(messages, { signal: input.signal });
    const finishedAt = deps.now();
    const referencedCardIds = input.referencedCards.map((card) => card.id);
    const session: ChatSession = shaped
      ? {
        ...withActiveConversationMessages(shaped, [
          ...messages.filter((message) => message.role !== 'system'),
          { role: 'assistant', content: reply },
        ], finishedAt),
        skillId,
        referencedCardIds,
      }
      : createChatSession({
        id: deps.id(),
        workflowId: input.workflowId,
        nodeId: input.nodeId,
        skillId,
        referencedCardIds,
        createdAt: finishedAt,
        updatedAt: finishedAt,
        conversationId: deps.id(),
        messages: [
          ...messages.filter((message) => message.role !== 'system'),
          { role: 'assistant', content: reply },
        ],
      });
    return { status: 'succeeded', startedAt, finishedAt, session };
  } catch (error) {
    const finishedAt = deps.now();
    if (
      (error instanceof AiClientError && error.kind === 'stopped')
      || input.signal.aborted
    ) {
      return { status: 'stopped', startedAt, finishedAt };
    }
    return failed(
      startedAt,
      finishedAt,
      error instanceof AiClientError ? error.kind : 'invalid-response',
    );
  }
}
