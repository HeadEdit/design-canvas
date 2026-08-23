import { z } from 'zod';

export const textSelectConfigSchema = z.object({
  sourceItemId: z.string(),
});

export type TextSelectConfig = z.infer<typeof textSelectConfigSchema>;

export const defaultTextSelectConfig: TextSelectConfig = {
  sourceItemId: '',
};
