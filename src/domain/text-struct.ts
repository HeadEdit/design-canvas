import type { TextStructItem, TextStructTitleSource } from './model';

const FALLBACK_TITLE_MAX = 24;

export function formatQaContent(question: string, answer: string): string {
  return `用户：${question}\n\nAI：${answer}`;
}

export function formatConversationContent(
  turns: readonly { question: string; answer: string }[],
): string {
  return turns.map((turn) => formatQaContent(turn.question, turn.answer)).join('\n\n');
}

export function fallbackTitle(question: string): string {
  const trimmed = question.trim();
  if (trimmed.length <= FALLBACK_TITLE_MAX) return trimmed;
  return `${trimmed.slice(0, FALLBACK_TITLE_MAX)}…`;
}

export interface CreateTextStructItemInput {
  id: string;
  turnId: string;
  createdAt: string;
  title?: string;
  titleSource?: TextStructTitleSource;
  question?: string;
  answer?: string;
  content?: string;
  conversationId?: string;
}

export function createTextStructItem(input: CreateTextStructItemInput): TextStructItem {
  const title = input.title?.trim();
  const titleSource: TextStructTitleSource = title
    ? (input.titleSource ?? 'auto')
    : 'fallback';
  const content = input.content
    ?? formatQaContent(input.question ?? '', input.answer ?? '');
  return {
    id: input.id,
    title: title || fallbackTitle(input.question ?? ''),
    content,
    turnId: input.turnId,
    createdAt: input.createdAt,
    titleSource,
    titleUpdatedAt: input.createdAt,
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
  };
}

export function aggregateTextStructItems(
  items: readonly TextStructItem[],
): TextStructItem[] {
  const byId = new Map<string, TextStructItem>();
  for (const item of items) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? -1 : 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
