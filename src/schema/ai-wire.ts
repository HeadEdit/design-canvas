import { z } from 'zod';
import { nonblankString } from './common';

export const candidateCardWireSchema = z.object({
  title: nonblankString,
  concept: nonblankString,
  content: nonblankString,
  tags: z.array(z.string()),
}).strict();
