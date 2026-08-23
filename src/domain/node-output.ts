import { z } from 'zod';

import type { NodeDefinition } from './node-definitions';
import type { NodeOutput } from './model';

const textStructItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  turnId: z.string(),
  conversationId: z.string().optional(),
  createdAt: z.string(),
  titleSource: z.enum(['auto', 'fallback', 'user']),
  titleUpdatedAt: z.string(),
});

const nodeOutputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Text'), value: z.string() }),
  z.object({ type: z.literal('Text[]'), values: z.array(z.string()) }),
  z.object({ type: z.literal('CardCollection'), cardIds: z.array(z.string()) }),
  z.object({ type: z.literal('TextStruct'), items: z.array(textStructItemSchema) }),
]);

export function canonicalizeNodeOutput(
  definition: NodeDefinition,
  output: unknown,
): NodeOutput | undefined {
  const parsed = nodeOutputSchema.safeParse(output);
  if (!parsed.success) return undefined;
  const supportsType = definition.outputs.some((port) => (
    port.type !== 'Control' && port.type === parsed.data.type
  ));
  return supportsType ? parsed.data : undefined;
}

export function nodeOutputsEqual(left: NodeOutput, right: NodeOutput): boolean {
  if (left.type !== right.type) return false;
  switch (left.type) {
    case 'Text':
      return right.type === 'Text' && left.value === right.value;
    case 'Text[]':
      return right.type === 'Text[]'
        && left.values.length === right.values.length
        && left.values.every((value, index) => value === right.values[index]);
    case 'CardCollection':
      return right.type === 'CardCollection'
        && left.cardIds.length === right.cardIds.length
        && left.cardIds.every((id, index) => id === right.cardIds[index]);
    case 'TextStruct':
      return right.type === 'TextStruct'
        && left.items.length === right.items.length
        && left.items.every((item, index) => {
          const other = right.items[index];
          return other !== undefined
            && item.id === other.id
            && item.title === other.title
            && item.content === other.content
            && item.turnId === other.turnId
            && item.conversationId === other.conversationId
            && item.createdAt === other.createdAt
            && item.titleSource === other.titleSource
            && item.titleUpdatedAt === other.titleUpdatedAt;
        });
  }
}
