import { z } from 'zod';

export const referenceConfigSchema = z.object({
  documentIds: z.array(z.string()),
});

export type ReferenceConfig = z.infer<typeof referenceConfigSchema>;

export const defaultReferenceConfig: ReferenceConfig = {
  documentIds: [],
};
