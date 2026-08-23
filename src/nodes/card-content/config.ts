import { z } from 'zod';

export const cardContentConfigSchema = z.object({
  sourceCardId: z.string(),
  method: z.string(),
  title: z.string(),
  concept: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  vote: z.union([z.literal('up'), z.literal('down'), z.null()]).optional(),
});

export type CardContentConfig = z.infer<typeof cardContentConfigSchema>;

export const defaultCardContentConfig: CardContentConfig = {
  sourceCardId: '',
  method: '',
  title: '',
  concept: '',
  content: '',
  tags: [],
};
