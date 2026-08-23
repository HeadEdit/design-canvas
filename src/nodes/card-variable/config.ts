import { z } from 'zod';

export const cardVariableConfigSchema = z.object({
  name: z.string().default('卡片池'),
});

export type CardVariableConfig = z.infer<typeof cardVariableConfigSchema>;

export const defaultCardVariableConfig: CardVariableConfig = cardVariableConfigSchema.parse({});
