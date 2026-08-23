import { z } from 'zod';

export const contentExtractConfigSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const config = value as Record<string, unknown>;
  const { targetItemId: _legacyTargetItemId, ...rest } = config;
  if (rest.summaryStatus === 'missing-target') {
    rest.summaryStatus = 'idle';
  }
  return rest;
}, z.object({
  summary: z.string(),
  summarySourceContent: z.string().nullable(),
  summaryStatus: z.enum(['idle', 'ready', 'stale', 'failed']),
  lastError: z.string().optional(),
}));

export type ContentExtractConfig = z.infer<typeof contentExtractConfigSchema>;

export const defaultContentExtractConfig: ContentExtractConfig = {
  summary: '',
  summarySourceContent: null,
  summaryStatus: 'idle',
};
