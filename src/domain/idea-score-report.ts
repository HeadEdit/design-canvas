import { z } from 'zod';

import type { Workflow } from './model';

export const scoreDimensionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
});

export const ideaScoreCardResultSchema = z.object({
  cardId: z.string(),
  title: z.string(),
  scores: z.array(z.object({
    dimensionId: z.string(),
    score: z.number(),
    reason: z.string(),
  })),
  average: z.number(),
});

export const ideaScoreReportSchema = z.object({
  scoredAt: z.string(),
  contextUsed: z.string(),
  dimensionSnapshot: z.array(scoreDimensionSchema),
  cards: z.array(ideaScoreCardResultSchema),
});

export const ideaScoreSortSchema = z.object({
  key: z.string().min(1),
  direction: z.enum(['asc', 'desc']),
});

export const defaultIdeaScoreSort = {
  key: 'average',
  direction: 'desc' as const,
};

export type ScoreDimension = z.infer<typeof scoreDimensionSchema>;
export type IdeaScoreReport = z.infer<typeof ideaScoreReportSchema>;
export type IdeaScoreSort = z.infer<typeof ideaScoreSortSchema>;

const ideaScoreReportStateSchema = z.object({
  dimensions: z.array(scoreDimensionSchema).default([]),
  report: ideaScoreReportSchema.nullable().default(null),
  sort: ideaScoreSortSchema.default(defaultIdeaScoreSort),
});

export function readIdeaScoreReportState(config: unknown): {
  dimensions: ScoreDimension[];
  report: IdeaScoreReport | null;
  sort: IdeaScoreSort;
} | null {
  const parsed = ideaScoreReportStateSchema.safeParse(config);
  return parsed.success ? parsed.data : null;
}

function dimensionKey(dimension: ScoreDimension): string {
  return `${dimension.id}\0${dimension.name}\0${dimension.description}`;
}

export function isIdeaScoreReportStale(
  dimensions: readonly ScoreDimension[],
  report: IdeaScoreReport | null,
): boolean {
  if (!report) return false;
  const current = dimensions.map(dimensionKey).sort().join('|');
  const snapshot = report.dimensionSnapshot.map(dimensionKey).sort().join('|');
  return current !== snapshot;
}

export function nextIdeaScoreSort(
  current: IdeaScoreSort | undefined,
  key: string,
): IdeaScoreSort {
  const previous = current ?? defaultIdeaScoreSort;
  if (previous.key === key) {
    return {
      key,
      direction: previous.direction === 'desc' ? 'asc' : 'desc',
    };
  }
  return { key, direction: 'desc' };
}

function cardSortValue(
  card: IdeaScoreReport['cards'][number],
  key: string,
): number {
  if (key === 'average') {
    return card.average;
  }
  return card.scores.find((entry) => entry.dimensionId === key)?.score
    ?? Number.NEGATIVE_INFINITY;
}

export function sortIdeaScoreReportCards(
  cards: readonly IdeaScoreReport['cards'][number][],
  sort: IdeaScoreSort,
): IdeaScoreReport['cards'] {
  return [...cards].sort((left, right) => {
    const delta = cardSortValue(left, sort.key) - cardSortValue(right, sort.key);
    if (delta === 0) {
      return 0;
    }
    return sort.direction === 'asc' ? delta : -delta;
  });
}

export function sortedIdeaScoreOutputCardIds(
  inputCardIds: readonly string[],
  sortedReportCards: readonly { cardId: string }[],
): string[] {
  const scoredIds = sortedReportCards.map((card) => card.cardId);
  const scored = new Set(scoredIds);
  const unresolved = inputCardIds.filter((id) => !scored.has(id));
  return [...scoredIds, ...unresolved];
}

export function patchIdeaScoreReportCardTitle(
  report: IdeaScoreReport,
  cardId: string,
  title: string,
): IdeaScoreReport {
  let changed = false;
  const cards = report.cards.map((entry) => {
    if (entry.cardId !== cardId || entry.title === title) {
      return entry;
    }
    changed = true;
    return { ...entry, title };
  });
  return changed ? { ...report, cards } : report;
}

export function syncIdeaScoreReportTitlesInWorkflow(
  workflow: Workflow,
  cardId: string,
  title: string,
): Workflow {
  let changed = false;
  const nodes = workflow.nodes.map((node) => {
    if (node.kind !== 'ideaScore') {
      return node;
    }
    const state = readIdeaScoreReportState(node.config);
    if (!state?.report) {
      return node;
    }
    const nextReport = patchIdeaScoreReportCardTitle(state.report, cardId, title);
    if (nextReport === state.report) {
      return node;
    }
    changed = true;
    return {
      ...node,
      config: {
        ...(typeof node.config === 'object' && node.config !== null
          ? node.config as Record<string, unknown>
          : {}),
        report: nextReport,
      },
    };
  });
  return changed ? { ...workflow, nodes } : workflow;
}
