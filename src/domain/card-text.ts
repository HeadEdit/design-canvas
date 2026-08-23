import type { CandidateCard } from './model';

export function formatCandidateCardText(card: CandidateCard): string {
  const tags = card.tags.join('、');
  return [
    `标题：${card.title}`,
    `概念：${card.concept}`,
    `方法：${card.method}`,
    `标签：${tags}`,
    '',
    card.content,
  ].join('\n');
}
