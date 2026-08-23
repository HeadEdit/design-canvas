export function applySelectChanges(
  selectedIds: readonly string[],
  changes: ReadonlyArray<{ id: string; selected: boolean }>,
): string[] {
  let next = [...selectedIds];
  for (const change of changes) {
    next = next.filter((id) => id !== change.id);
    if (change.selected) {
      next.push(change.id);
    }
  }
  return next;
}

export function pruneSelectedIds(
  selectedIds: readonly string[],
  existingIds: ReadonlySet<string>,
): string[] {
  return selectedIds.filter((id) => existingIds.has(id));
}
