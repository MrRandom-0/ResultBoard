/**
 * Auto-archive utility.
 * Checks active projects' updatedAt timestamps against the configured
 * autoArchiveDays setting and archives stale ones.
 * Called from background startup.
 */

import type { StoredDatabase } from '../models/types';

/**
 * Identify and archive projects that have not been updated within the
 * configured autoArchiveDays threshold.
 *
 * @param state - Current stored database state
 * @returns Array of project IDs that were archived, or empty if none
 */
export function getStaleProjectIds(state: StoredDatabase): string[] {
  const { autoArchiveDays } = state.settings;

  // 0 means auto-archive is disabled
  if (!autoArchiveDays || autoArchiveDays <= 0) return [];

  const now = Date.now();
  const thresholdMs = autoArchiveDays * 24 * 60 * 60 * 1000;
  const staleIds: string[] = [];

  for (const project of state.projects) {
    if (project.status !== 'active') continue;

    const updatedAt = new Date(project.updatedAt).getTime();
    if (isNaN(updatedAt)) continue;

    if (now - updatedAt > thresholdMs) {
      staleIds.push(project.id);
    }
  }

  return staleIds;
}
