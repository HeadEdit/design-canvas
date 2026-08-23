import type { ChatMessage } from './model';

export const NO_CHAT_SKILL = '__none__';

export function groupChatTurns(messages: readonly ChatMessage[]): ChatMessage[][] {
  const turns: ChatMessage[][] = [];
  for (const message of messages) {
    if (message.role === 'system') continue;
    const last = turns[turns.length - 1];
    if (
      message.role === 'assistant'
      && last
      && last[0]?.role === 'user'
      && last.length === 1
    ) {
      last.push(message);
    } else {
      turns.push([message]);
    }
  }
  return turns;
}

export function omitChatTurns(
  messages: readonly ChatMessage[],
  turnIndexes: readonly number[],
): ChatMessage[] {
  const drop = new Set(turnIndexes);
  return groupChatTurns(messages).flatMap((turn, index) => (drop.has(index) ? [] : turn));
}

export function formatChatContextText(messages: readonly ChatMessage[]): string {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => `${message.role === 'user' ? '用户' : 'AI'}：${message.content}`)
    .join('\n\n');
}
