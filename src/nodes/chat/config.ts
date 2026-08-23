import { z } from 'zod';

export const chatConfigSchema = z.object({
  skillId: z.string(),
});

export type ChatConfig = z.infer<typeof chatConfigSchema>;
export const defaultChatConfig: ChatConfig = { skillId: 'brainstorm' };
