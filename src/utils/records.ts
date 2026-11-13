import type { ComparisonCriterion, SearchResultRecord } from '../models/types';

export type SortKey = 'newest' | 'oldest' | 'title' | 'domain' | 'status';
export interface RecordFilters {
  query: string;
  statuses: SearchResultRecord['status'][];
  tagIds: string[];
  domain: string;
  hasNote: boolean | null;
}

const STATUS_ORDER: Record<string, number> = { keep: 0, maybe: 1, reject: 2 };

export function filterRecords(records: SearchResultRecord[], filters: RecordFilters): SearchResultRecord[] {
  const query = filters.query.trim().toLowerCase();
  return records.filter((record) => {
    if (filters.statuses.length && !filters.statuses.includes(record.status)) return false;
    if (filters.tagIds.length && !filters.tagIds.every((tag) => record.tagIds.includes(tag))) return false;
    if (filters.domain && record.domain !== filters.domain) return false;
    if (filters.hasNote !== null && Boolean(record.notes.trim()) !== filters.hasNote) return false;
    return !query || [record.title, record.snippet, record.domain, record.notes, ...record.sourceQueries].some((value) => value.toLowerCase().includes(query));
  });
}

export function sortRecords(records: SearchResultRecord[], sort: SortKey): SearchResultRecord[] {
  return [...records].sort((a, b) => {
    if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt);
    if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
    if (sort === 'title') return a.title.localeCompare(b.title);
    if (sort === 'status') return (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) || b.createdAt.localeCompare(a.createdAt);
    return a.domain.localeCompare(b.domain) || a.title.localeCompare(b.title);
  });
}

export interface DuplicateGroup {
  projectId: string;
  canonicalUrl: string;
  /** The record that survives cleanup: the earliest saved copy. */
  keeper: SearchResultRecord;
  /** Later copies of the same URL, oldest first. Safe to remove. */
  duplicates: SearchResultRecord[];
}

/**
 * Find records that save the same canonical URL more than once in a project.
 *
 * Classifying from a search page already dedupes by canonical URL, but a
 * merge import matches records by id, so importing a board exported from
 * another profile (where the same URL has a different id) can leave true
 * duplicates behind. The earliest copy is the keeper because classify
 * refreshes it in place and accumulates its source queries.
 */
export function findDuplicateGroups(records: SearchResultRecord[]): DuplicateGroup[] {
  const byKey = new Map<string, SearchResultRecord[]>();
  for (const record of records) {
    const key = `${record.projectId}\n${record.canonicalUrl}`;
    const group = byKey.get(key);
    if (group) group.push(record);
    else byKey.set(key, [record]);
  }
  const groups: DuplicateGroup[] = [];
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    groups.push({
      projectId: sorted[0]!.projectId,
      canonicalUrl: sorted[0]!.canonicalUrl,
      keeper: sorted[0]!,
      duplicates: sorted.slice(1),
    });
  }
  return groups.sort((a, b) => a.canonicalUrl.localeCompare(b.canonicalUrl));
}

/** Ids of every duplicate copy (never a keeper) across all groups. */
export function duplicateRecordIds(records: SearchResultRecord[]): string[] {
  return findDuplicateGroups(records).flatMap((group) => group.duplicates.map((record) => record.id));
}

export function groupByDomain(records: SearchResultRecord[]): Map<string, SearchResultRecord[]> {
  const groups = new Map<string, SearchResultRecord[]>();
  for (const record of records) {
    const existing = groups.get(record.domain);
    if (existing) {
      existing.push(record);
    } else {
      groups.set(record.domain, [record]);
    }
  }
  return groups;
}

export interface ComparisonScore {
  recordId: string;
  score: number;
}

/**
 * Calculate weighted comparison scores for records based on criteria.
 *
 * PLACEHOLDER SCORING: Currently each criterion evaluates to the same value
 * for a given record, derived from its overall status (keep=1, maybe=0.5, reject=0).
 * This means criteria are interchangeable -- only their weights affect the final total.
 *
 * A future iteration will add per-record-per-criterion scoring (a scores map on the
 * record model) to allow users to rate each criterion independently for each result.
 * For now this provides a useful weighted ranking based on the classification status.
 */
export function calculateComparisonScores(
  records: SearchResultRecord[],
  criteria: ComparisonCriterion[]
): ComparisonScore[] {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) {
    return records.map((record) => ({ recordId: record.id, score: 0 }));
  }

  return records.map((record) => {
    const raw = criteria.reduce((sum, criterion) => {
      const rating = record.criterionScores?.[criterion.id] ?? 0;
      return sum + (rating / 5) * criterion.weight;
    }, 0);
    return { recordId: record.id, score: raw / totalWeight };
  });
}
