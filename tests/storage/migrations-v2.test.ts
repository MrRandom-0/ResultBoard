import { describe, it, expect } from 'vitest';
import { migrateDatabase, MigrationError } from '../../src/storage/migrations';
import { DATABASE_VERSION } from '../../src/models/types';

describe('migrations v1 -> v2', () => {
  const baseV1Data = {
    version: 1,
    activeProjectId: 'proj-1',
    projects: [
      { id: 'proj-1', name: 'Research', status: 'active', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-15T00:00:00.000Z' },
    ],
    records: [
      {
        id: 'rec-1', projectId: 'proj-1', canonicalUrl: 'https://example.com',
        url: 'https://example.com', title: 'Example', snippet: 'A snippet',
        domain: 'example.com', status: 'keep', notes: 'Some notes',
        tagIds: ['tag-1'], sourceQueries: ['test query'],
        createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-10T00:00:00.000Z',
      },
    ],
    tags: [{ id: 'tag-1', projectId: 'proj-1', name: 'Important', color: '#ff0000', createdAt: '2024-01-01T00:00:00.000Z' }],
    settings: {
      theme: 'dark',
      rejectedDisplay: 'hide',
      analyticsEnabled: true,
      onboardingComplete: true,
      paused: false,
      density: 'compact',
      plan: 'pro',
    },
  };

  it('migrates v1 to v2 successfully', () => {
    const result = migrateDatabase(baseV1Data);
    expect(result.version).toBe(DATABASE_VERSION);
    expect(result.version).toBe(DATABASE_VERSION);
  });

  it('adds rejectionReason field to all records', () => {
    const result = migrateDatabase(baseV1Data);
    expect(result.records[0]!.rejectionReason).toBe('');
    for (const record of result.records) {
      expect(record).toHaveProperty('rejectionReason');
    }
  });

  it('adds comparisonCriteria array', () => {
    const result = migrateDatabase(baseV1Data);
    expect(result.comparisonCriteria).toEqual([]);
    expect(Array.isArray(result.comparisonCriteria)).toBe(true);
  });

  it('adds shortcuts to settings', () => {
    const result = migrateDatabase(baseV1Data);
    expect(result.settings.shortcuts).toBeDefined();
    expect(result.settings.shortcuts.nextResult).toBe('j');
    expect(result.settings.shortcuts.prevResult).toBe('k');
    expect(result.settings.shortcuts.keepResult).toBe('g');
    expect(result.settings.shortcuts.maybeResult).toBe('m');
    expect(result.settings.shortcuts.rejectResult).toBe('r');
    expect(result.settings.shortcuts.openBoard).toBe('b');
    expect(result.settings.shortcuts.togglePanel).toBe('p');
  });

  it('preserves existing settings during migration', () => {
    const result = migrateDatabase(baseV1Data);
    expect(result.settings.theme).toBe('dark');
    expect(result.settings.rejectedDisplay).toBe('hide');
    expect(result.settings.density).toBe('compact');
  });

  it('preserves project data during migration', () => {
    const result = migrateDatabase(baseV1Data);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]!.id).toBe('proj-1');
    expect(result.projects[0]!.name).toBe('Research');
    expect(result.projects[0]!.status).toBe('active');
    expect(result.activeProjectId).toBe('proj-1');
  });

  it('preserves record data during migration', () => {
    const result = migrateDatabase(baseV1Data);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]!.id).toBe('rec-1');
    expect(result.records[0]!.title).toBe('Example');
    expect(result.records[0]!.notes).toBe('Some notes');
    expect(result.records[0]!.tagIds).toEqual(['tag-1']);
    expect(result.records[0]!.sourceQueries).toEqual(['test query']);
  });

  it('preserves tags during migration', () => {
    const result = migrateDatabase(baseV1Data);
    expect(result.tags).toHaveLength(1);
    expect(result.tags[0]!.name).toBe('Important');
    expect(result.tags[0]!.color).toBe('#ff0000');
  });

  it('handles multiple records during migration', () => {
    const data = {
      ...baseV1Data,
      records: [
        { ...baseV1Data.records[0], id: 'rec-1', status: 'keep' },
        { ...baseV1Data.records[0], id: 'rec-2', status: 'maybe', canonicalUrl: 'https://other.com', url: 'https://other.com', title: 'Other' },
        { ...baseV1Data.records[0], id: 'rec-3', status: 'reject', canonicalUrl: 'https://bad.com', url: 'https://bad.com', title: 'Bad' },
      ],
    };

    const result = migrateDatabase(data);
    expect(result.records).toHaveLength(3);
    expect(result.records[0]!.rejectionReason).toBe('');
    expect(result.records[1]!.rejectionReason).toBe('');
    expect(result.records[2]!.rejectionReason).toBe('');
  });

  it('migrates v1 with existing shortcuts object (merges with defaults)', () => {
    const data = {
      ...baseV1Data,
      settings: {
        ...baseV1Data.settings,
        shortcuts: { nextResult: 'n', prevResult: 'p' },
      },
    };

    const result = migrateDatabase(data);
    expect(result.settings.shortcuts.nextResult).toBe('n');
    expect(result.settings.shortcuts.prevResult).toBe('p');
    // Defaults for missing keys
    expect(result.settings.shortcuts.keepResult).toBe('g');
  });

  it('handles v1 with empty records array', () => {
    const data = { ...baseV1Data, records: [] };
    const result = migrateDatabase(data);
    expect(result.records).toEqual([]);
    expect(result.comparisonCriteria).toEqual([]);
  });

  it('handles full migration chain from v0 to v2', () => {
    const v0Data = {
      version: 0,
      activeProjectId: 'proj-1',
      projects: [{ id: 'proj-1', name: 'Old Project', status: 'active', createdAt: '2023-06-01', updatedAt: '2023-06-01' }],
      records: [
        {
          id: 'rec-1', projectId: 'proj-1', canonicalUrl: 'https://legacy.com',
          url: 'https://legacy.com', title: 'Legacy', snippet: '',
          domain: 'legacy.com', status: 'maybe', notes: '',
          tagIds: [], sourceQueries: [],
          createdAt: '2023-06-01', updatedAt: '2023-06-01',
        },
      ],
      tags: [],
      settings: { theme: 'light' },
    };

    const result = migrateDatabase(v0Data);
    expect(result.version).toBe(DATABASE_VERSION);
    expect(result.records[0]!.rejectionReason).toBe('');
    expect(result.comparisonCriteria).toEqual([]);
    expect(result.settings.shortcuts).toBeDefined();
    expect(result.settings.theme).toBe('light');
  });

  it('throws for versions higher than current', () => {
    expect(() => migrateDatabase({ version: DATABASE_VERSION + 1 })).toThrow(MigrationError);
  });

  it('throws for invalid data structure', () => {
    expect(() => migrateDatabase({ version: 1, records: 'not-array' })).toThrow(MigrationError);
  });
});
