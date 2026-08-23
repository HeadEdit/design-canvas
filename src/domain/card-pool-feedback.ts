import type { CandidateCard, WorkflowNode } from './model';

export interface CardPoolFeedbackSummary {
  poolCount: number;
  upCount: number;
  downCount: number;
  scoredCount: number;
  voted: CandidateCard[];
  scored: CandidateCard[];
}

function poolCardIds(node: WorkflowNode): readonly string[] {
  return node.output?.type === 'CardCollection' ? node.output.cardIds : [];
}

export function summarizeCardPoolFeedback(
  node: WorkflowNode,
  cards: readonly CandidateCard[],
): CardPoolFeedbackSummary {
  const cardIds = poolCardIds(node);
  const byId = new Map(cards.map((card) => [card.id, card]));
  const pool: CandidateCard[] = [];
  for (const id of cardIds) {
    const card = byId.get(id);
    if (card) pool.push(card);
  }

  const up = pool.filter((card) => card.vote === 'up');
  const down = pool.filter((card) => card.vote === 'down');
  const scored = pool
    .filter((card) => card.score !== undefined)
    .slice()
    .sort((a, b) => (b.score?.average ?? 0) - (a.score?.average ?? 0));

  return {
    poolCount: cardIds.length,
    upCount: up.length,
    downCount: down.length,
    scoredCount: scored.length,
    voted: [...up, ...down],
    scored,
  };
}
