import { describe, it, expect } from 'vitest';
import { filterRecords, sortRecords } from '../../src/utils/records';
import type { SearchResultRecord } from '../../src/models/types';

function makeRecord(overrides: Partial<SearchResultRecord> = {}): SearchResultRecord {
  return {
    id: 'rec-1',
    projectId: 'proj-1',
    canonicalUrl: 'https://example.com/page',
    url: 'https://example.com/page',
    title: 'Example Page',
    snippet: 'A test snippet',
    domain: 'example.com',
    status: 'keep',
    rejectionReason: '',
    notes: '',
    tagIds: [],
    sourceQueries: ['test query'],
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

const emptyFilters = {
  query: '',
  statuses: [] as SearchResultRecord['status'][],
  tagIds: [] as string[],
  domain: '',
  hasNote: null,
};

describe('filterRecords', () => {
  it('returns all records when no filters are active', () => {
    const records = [makeRecord({ id: '1' }), makeRecord({ id: '2' })];
    expect(filterRecords(records, emptyFilters)).toHaveLength(2);
  });

  it('filters by status', () => {
    const records = [
      makeRecord({ id: '1', status: 'keep' }),
      makeRecord({ id: '2', status: 'reject' }),
      makeRecord({ id: '3', status: 'maybe' }),
    ];
    const result = filterRecords(records, { ...emptyFilters, statuses: ['keep'] });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('1');
  });

  it('filters by multiple statuses', () => {
    const records = [
      makeRecord({ id: '1', status: 'keep' }),
      makeRecord({ id: '2', status: 'reject' }),
      makeRecord({ id: '3', status: 'maybe' }),
    ];
    const result = filterRecords(records, { ...emptyFilters, statuses: ['keep', 'maybe'] });
    expect(result).toHaveLength(2);
  });

  it('filters by tag IDs (requires all)', () => {
    const records = [
      makeRecord({ id: '1', tagIds: ['a', 'b'] }),
      makeRecord({ id: '2', tagIds: ['a'] }),
      makeRecord({ id: '3', tagIds: ['b', 'c'] }),
    ];
    const result = filterRecords(records, { ...emptyFilters, tagIds: ['a', 'b'] });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('1');
  });

  it('filters by domain', () => {
    const records = [
      makeRecord({ id: '1', domain: 'example.com' }),
      makeRecord({ id: '2', domain: 'other.com' }),
    ];
    const result = filterRecords(records, { ...emptyFilters, domain: 'example.com' });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('1');
  });

  it('filters by hasNote = true', () => {
    const records = [
      makeRecord({ id: '1', notes: 'Some note' }),
      makeRecord({ id: '2', notes: '' }),
      makeRecord({ id: '3', notes: '   ' }),
    ];
    const result = filterRecords(records, { ...emptyFilters, hasNote: true });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('1');
  });

  it('filters by hasNote = false', () => {
    const records = [
      makeRecord({ id: '1', notes: 'Some note' }),
      makeRecord({ id: '2', notes: '' }),
    ];
    const result = filterRecords(records, { ...emptyFilters, hasNote: false });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('2');
  });

  it('filters by text query (searches title, snippet, domain, notes, sourceQueries)', () => {
    const records = [
      makeRecord({ id: '1', title: 'React tutorial' }),
      makeRecord({ id: '2', title: 'Vue guide', snippet: 'Learn about React hooks' }),
      makeRecord({ id: '3', title: 'Angular docs' }),
    ];
    const result = filterRecords(records, { ...emptyFilters, query: 'react' });
    expect(result).toHaveLength(2);
  });

  it('query search is case-insensitive', () => {
    const records = [makeRecord({ id: '1', title: 'TypeScript Guide' })];
    const result = filterRecords(records, { ...emptyFilters, query: 'TYPESCRIPT' });
    expect(result).toHaveLength(1);
  });
});

describe('sortRecords', () => {
  const records: SearchResultRecord[] = [
    makeRecord({ id: '1', title: 'Beta', domain: 'b.com', createdAt: '2024-01-02T00:00:00.000Z' }),
    makeRecord({ id: '2', title: 'Alpha', domain: 'a.com', createdAt: '2024-01-01T00:00:00.000Z' }),
    makeRecord({ id: '3', title: 'Gamma', domain: 'c.com', createdAt: '2024-01-03T00:00:00.000Z' }),
  ];

  it('sorts by newest first', () => {
    const result = sortRecords(records, 'newest');
    expect(result.map((r) => r.id)).toEqual(['3', '1', '2']);
  });

  it('sorts by oldest first', () => {
    const result = sortRecords(records, 'oldest');
    expect(result.map((r) => r.id)).toEqual(['2', '1', '3']);
  });

  it('sorts by title alphabetically', () => {
    const result = sortRecords(records, 'title');
    expect(result.map((r) => r.id)).toEqual(['2', '1', '3']);
  });

  it('sorts by domain then title', () => {
    const withSameDomain = [
      makeRecord({ id: '1', title: 'Zeta', domain: 'a.com' }),
      makeRecord({ id: '2', title: 'Alpha', domain: 'a.com' }),
      makeRecord({ id: '3', title: 'Beta', domain: 'b.com' }),
    ];
    const result = sortRecords(withSameDomain, 'domain');
    expect(result.map((r) => r.id)).toEqual(['2', '1', '3']);
  });

  it('does not mutate original array', () => {
    const original = [...records];
    sortRecords(records, 'newest');
    expect(records).toEqual(original);
  });
});
