import type { CandidateCard, WorkflowNode } from '../../domain/model';

export interface CardVariablePoolSummary {
  poolCount: number;
  upCount: number;
  downCount: number;
  scoredCount: number;
  cards: CandidateCard[];
}

export interface CardPoolBadge {
  kind: 'up' | 'down' | 'score';
  text: string;
}

function poolCardIds(node: WorkflowNode): readonly string[] {
  return node.output?.type === 'CardCollection' ? node.output.cardIds : [];
}

function formatAverage(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function summarizeCardVariablePool(
  node: WorkflowNode,
  cards: readonly CandidateCard[],
): CardVariablePoolSummary {
  const cardIds = poolCardIds(node);
  const byId = new Map(cards.map((card) => [card.id, card]));
  const pooled: CandidateCard[] = [];
  for (const id of cardIds) {
    const card = byId.get(id);
    if (card) pooled.push(card);
  }

  return {
    poolCount: cardIds.length,
    upCount: pooled.filter((card) => card.vote === 'up').length,
    downCount: pooled.filter((card) => card.vote === 'down').length,
    scoredCount: pooled.filter((card) => card.score !== undefined).length,
    cards: pooled,
  };
}

export function formatCardPoolBadge(card: CandidateCard): CardPoolBadge | null {
  const voteKind = card.vote === 'up' || card.vote === 'down' ? card.vote : undefined;
  const voteLabel = voteKind === 'up' ? '赞' : voteKind === 'down' ? '踩' : undefined;
  const scoreLabel = card.score === undefined ? undefined : formatAverage(card.score.average);
  if (voteKind && voteLabel && scoreLabel) {
    return { kind: voteKind, text: `${voteLabel} · ${scoreLabel}` };
  }
  if (voteKind && voteLabel) {
    return { kind: voteKind, text: voteLabel };
  }
  if (scoreLabel) {
    return { kind: 'score', text: scoreLabel };
  }
  return null;
}
