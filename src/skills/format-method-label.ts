import { getSkill } from './registry';

export function formatMethodLabel(methodId: string): string {
  return getSkill(methodId)?.name ?? methodId;
}
