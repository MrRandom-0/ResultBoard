import { describe, it, expect } from 'vitest';
import { recordsToJson, recordsToMarkdown, recordsToHtml } from '../../src/utils/export';
import type { Project, SearchResultRecord, StoredDatabase, Tag } from '../../src/models/types';
import { emptyDatabase } from '../../src/models/types';

function makeRecord(overrides: Partial<SearchResultRecord> = {}): SearchResultRecord {
  return {
    id: 'rec-1',
    projectId: 'proj-1',
    canonicalUrl: 'https://example.com',
    url: 'https://example.com',
    title: 'Example Page',
    snippet: 'A short description of the page.',
    domain: 'example.com',
    status: 'keep',
    rejectionReason: '',
    notes: '',
    tagIds: [],
    sourceQueries: ['test query'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Project',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 'tag-1',
    projectId: 'proj-1',
    name: 'Important',
    color: '#ff0000',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('recordsToJson', () => {
  it('exports valid JSON with project metadata', () => {
    const db: StoredDatabase = {
      ...emptyDatabase(),
      projects: [makeProject()],
      records: [makeRecord()],
      tags: [makeTag()],
    };

    const json = recordsToJson(db, 'proj-1');
    const parsed = JSON.parse(json);

    expect(parsed.project).toEqual(expect.objectContaining({ id: 'proj-1', name: 'Test Project' }));
    expect(parsed.records).toHaveLength(1);
    expect(parsed.tags).toHaveLength(1);
    expect(parsed.stats.total).toBe(1);
    expect(parsed.stats.keep).toBe(1);
    expect(parsed.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('handles empty records', () => {
    const db: StoredDatabase = {
      ...emptyDatabase(),
      projects: [makeProject()],
    };

    const json = recordsToJson(db, 'proj-1');
    const parsed = JSON.parse(json);

    expect(parsed.records).toEqual([]);
    expect(parsed.stats.total).toBe(0);
    expect(parsed.stats.keep).toBe(0);
  });

  it('filters records by project ID', () => {
    const db: StoredDatabase = {
      ...emptyDatabase(),
      projects: [makeProject(), makeProject({ id: 'proj-2', name: 'Other' })],
      records: [
        makeRecord({ id: 'rec-1', projectId: 'proj-1' }),
        makeRecord({ id: 'rec-2', projectId: 'proj-2' }),
      ],
    };

    const json = recordsToJson(db, 'proj-1');
    const parsed = JSON.parse(json);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].id).toBe('rec-1');
  });

  it('counts statuses correctly', () => {
    const db: StoredDatabase = {
      ...emptyDatabase(),
      projects: [makeProject()],
      records: [
        makeRecord({ id: 'r1', status: 'keep' }),
        makeRecord({ id: 'r2', status: 'keep' }),
        makeRecord({ id: 'r3', status: 'maybe' }),
        makeRecord({ id: 'r4', status: 'reject' }),
      ],
    };

    const json = recordsToJson(db, 'proj-1');
    const parsed = JSON.parse(json);
    expect(parsed.stats.keep).toBe(2);
    expect(parsed.stats.maybe).toBe(1);
    expect(parsed.stats.reject).toBe(1);
    expect(parsed.stats.total).toBe(4);
  });

  it('returns null project for nonexistent project ID', () => {
    const db = emptyDatabase();
    const json = recordsToJson(db, 'nonexistent');
    const parsed = JSON.parse(json);
    expect(parsed.project).toBeNull();
  });
});

describe('recordsToMarkdown', () => {
  it('produces valid markdown with project heading', () => {
    const records = [makeRecord({ status: 'keep' })];
    const project = makeProject();
    const tags: Tag[] = [];

    const md = recordsToMarkdown(records, project, tags);
    expect(md).toContain('# Test Project');
    expect(md).toContain('1 results');
    expect(md).toContain('## Kept (1)');
    expect(md).toContain('### Example Page');
    expect(md).toContain('<https://example.com>');
  });

  it('groups records by status', () => {
    const records = [
      makeRecord({ id: 'r1', status: 'keep', title: 'Kept One' }),
      makeRecord({ id: 'r2', status: 'maybe', title: 'Maybe One' }),
      makeRecord({ id: 'r3', status: 'reject', title: 'Rejected One' }),
    ];

    const md = recordsToMarkdown(records, makeProject(), []);
    expect(md).toContain('## Kept (1)');
    expect(md).toContain('## Maybe (1)');
    expect(md).toContain('## Rejected (1)');
  });

  it('handles empty records gracefully', () => {
    const md = recordsToMarkdown([], makeProject(), []);
    expect(md).toContain('# Test Project');
    expect(md).toContain('0 results');
    expect(md).not.toContain('## Kept');
  });

  it('includes notes, snippets, tags, and source queries', () => {
    const records = [
      makeRecord({
        notes: 'Important finding',
        snippet: 'A great snippet',
        tagIds: ['tag-1'],
        sourceQueries: ['query one', 'query two'],
      }),
    ];
    const tags = [makeTag()];

    const md = recordsToMarkdown(records, makeProject(), tags);
    expect(md).toContain('**Notes:** Important finding');
    expect(md).toContain('**Snippet:** A great snippet');
    expect(md).toContain('**Tags:** Important');
    expect(md).toContain('**Found via:** query one, query two');
  });

  it('includes rejection reason for rejected records', () => {
    const records = [makeRecord({ status: 'reject', rejectionReason: 'Outdated content' })];
    const md = recordsToMarkdown(records, makeProject(), []);
    expect(md).toContain('**Rejection reason:** Outdated content');
  });

  it('handles special characters in titles', () => {
    const records = [makeRecord({ title: 'Title with [brackets] & <special> chars' })];
    const md = recordsToMarkdown(records, makeProject(), []);
    expect(md).toContain('Title with \\[brackets\\] & <special> chars');
  });
});

describe('recordsToHtml', () => {
  it('produces valid HTML document', () => {
    const records = [makeRecord()];
    const html = recordsToHtml(records, makeProject(), []);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
    expect(html).toContain('<title>Test Project - ResultBoard Export</title>');
  });

  it('escapes HTML special characters', () => {
    const records = [
      makeRecord({
        title: '<script>alert("xss")</script>',
        url: 'https://example.com?a=1&b=2',
        snippet: 'Use <div> for "layouts"',
      }),
    ];

    const html = recordsToHtml(records, makeProject(), []);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;b=2');
    expect(html).toContain('&quot;layouts&quot;');
  });

  it('renders status colors correctly', () => {
    const records = [
      makeRecord({ id: 'r1', status: 'keep' }),
      makeRecord({ id: 'r2', status: 'maybe' }),
      makeRecord({ id: 'r3', status: 'reject' }),
    ];

    const html = recordsToHtml(records, makeProject(), []);
    expect(html).toContain('background:#496d59');
    expect(html).toContain('background:#936d2d');
    expect(html).toContain('background:#a84949');
  });

  it('handles empty records', () => {
    const html = recordsToHtml([], makeProject(), []);
    expect(html).toContain('0 results');
    expect(html).not.toContain('class="card"');
  });

  it('includes tags in card output', () => {
    const records = [makeRecord({ tagIds: ['tag-1'] })];
    const tags = [makeTag({ name: 'Research' })];

    const html = recordsToHtml(records, makeProject(), tags);
    expect(html).toContain('Research');
    expect(html).toContain('class="tag"');
  });

  it('includes notes and rejection reason', () => {
    const records = [
      makeRecord({ notes: 'My notes here', rejectionReason: 'Not relevant' }),
    ];

    const html = recordsToHtml(records, makeProject(), []);
    expect(html).toContain('My notes here');
    expect(html).toContain('Not relevant');
  });

  it('renders inline CSS styles', () => {
    const html = recordsToHtml([makeRecord()], makeProject(), []);
    expect(html).toContain('<style>');
    expect(html).toContain('font-family');
  });
});
