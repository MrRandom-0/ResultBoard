/**
 * Pure helpers for bulk operations on records.
 *
 * Tag changes are computed here (rather than inline in the repository) so the
 * merge/remove semantics are unit-testable and shared by every caller.
 */
export type TagChangeMode = 'add' | 'remove';

/**
 * Apply a bulk tag change to one record's tag list.
 *
 * - `add`: appends every id in `tagIds` that is not already present,
 *   preserving the order of the existing list and of `tagIds`.
 * - `remove`: drops every id in `tagIds`, preserving the order of the rest.
 *
 * Duplicates inside either input never produce duplicates in the result.
 */
export function applyTagIds(existing: string[], tagIds: string[], mode: TagChangeMode): string[] {
  if (mode === 'remove') {
    const removed = new Set(tagIds);
    return existing.filter((id) => !removed.has(id));
  }
  const next = [...new Set(existing)];
  for (const id of tagIds) {
    if (!next.includes(id)) next.push(id);
  }
  return next;
}

/** Whether a bulk tag change would actually change the record's tag list. */
export function tagChangeApplies(existing: string[], tagIds: string[], mode: TagChangeMode): boolean {
  const next = applyTagIds(existing, tagIds, mode);
  return next.length !== existing.length || next.some((id, index) => id !== existing[index]);
}
