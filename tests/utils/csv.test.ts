import { describe, it, expect } from 'vitest';
import { recordsToCsv } from '../../src/utils/csv';
import type { Project, SearchResultRecord, Tag } from '../../src/models/types';

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

const project: Project = {
  id: 'proj-1',
  name: 'My Research',
  status: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('recordsToCsv', () => {
  it('includes project as a standard CSV column', () => {
    const csv = recordsToCsv([], project, []);
    expect(csv.startsWith('"Project","Title"')).toBe(true);
  });

  it('outputs column header row', () => {
    const csv = recordsToCsv([], project, []);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(
      '"Project","Title","URL","Status","Domain","Notes","Tags","Source queries","Created","Updated"'
    );
  });

  it('outputs record data with proper quoting', () => {
    const record = makeRecord({ title: 'Test "Quotes"' });
    const csv = recordsToCsv([record], project, []);
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain('"Test ""Quotes"""');
  });

  it('resolves tag IDs to tag names', () => {
    const tags: Tag[] = [
      { id: 'tag-1', projectId: 'proj-1', name: 'Important', color: '#ff0000', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'tag-2', projectId: 'proj-1', name: 'Review', color: '#00ff00', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const record = makeRecord({ tagIds: ['tag-1', 'tag-2'] });
    const csv = recordsToCsv([record], project, tags);
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain('Important; Review');
  });

  it('filters records by project ID', () => {
    const records = [
      makeRecord({ id: 'rec-1', projectId: 'proj-1' }),
      makeRecord({ id: 'rec-2', projectId: 'other-project' }),
    ];
    const csv = recordsToCsv(records, project, []);
    const lines = csv.split('\r\n').filter((line) => line.length > 0);
    expect(lines).toHaveLength(2);
  });

  it('joins source queries with semicolons', () => {
    const record = makeRecord({ sourceQueries: ['query 1', 'query 2'] });
    const csv = recordsToCsv([record], project, []);
    expect(csv).toContain('query 1; query 2');
  });

  it('uses CRLF line endings', () => {
    const csv = recordsToCsv([makeRecord()], project, []);
    expect(csv).toContain('\r\n');
    expect(csv.split('\r\n')).toHaveLength(2);
  });

  it('neutralizes spreadsheet formulas in user-controlled cells', () => {
    const csv = recordsToCsv([makeRecord({ title: '=HYPERLINK("https://bad.example")' })], project, []);
    expect(csv).toContain('"\'=HYPERLINK(""https://bad.example"")"');
  });
});
