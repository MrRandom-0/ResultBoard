import { describe, it, expect } from 'vitest';
import { migrateDatabase, MigrationError } from '../../src/storage/migrations';
import { DATABASE_VERSION } from '../../src/models/types';

describe('migrateDatabase', () => {
  it('returns empty database for null input', () => {
    const result = migrateDatabase(null);
    expect(result.version).toBe(DATABASE_VERSION);
    expect(result.projects).toEqual([]);
    expect(result.records).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.comparisonCriteria).toEqual([]);
    expect(result.activeProjectId).toBeNull();
  });

  it('returns empty database for undefined input', () => {
    const result = migrateDatabase(undefined);
    expect(result.version).toBe(DATABASE_VERSION);
    expect(result.projects).toEqual([]);
    expect(result.records).toEqual([]);
  });

  it('parses valid v2 input unchanged', () => {
    const validData = {
      version: 2,
      activeProjectId: null,
      projects: [],
      records: [],
      tags: [],
      comparisonCriteria: [],
      settings: {
        theme: 'system',
        rejectedDisplay: 'fade',
        analyticsEnabled: false,
        onboardingComplete: false,
        paused: false,
        density: 'comfortable',
        plan: 'free',
        shortcuts: {
          nextResult: 'j',
          prevResult: 'k',
          keepResult: 'g',
          maybeResult: 'm',
          rejectResult: 'r',
          openBoard: 'b',
          togglePanel: 'p',
        },
      },
    };
    const result = migrateDatabase(validData);
    expect(result.version).toBe(DATABASE_VERSION);
    expect(result.settings.theme).toBe('system');
    expect(result.settings.shortcuts.nextResult).toBe('j');
    expect(result.comparisonCriteria).toEqual([]);
  });

  it('throws MigrationError for version higher than current', () => {
    const futureData = { version: DATABASE_VERSION + 1 };
    expect(() => migrateDatabase(futureData)).toThrow(MigrationError);
    expect(() => migrateDatabase(futureData)).toThrow('newer');
  });

  it('throws MigrationError for invalid data format', () => {
    const badData = { version: 0, projects: 'not-an-array' };
    expect(() => migrateDatabase(badData)).toThrow(MigrationError);
  });

  it('migrates v0 data to v2', () => {
    const v0Data = {
      version: 0,
      activeProjectId: null,
      projects: [],
      records: [],
      tags: [],
      settings: {},
    };
    const result = migrateDatabase(v0Data);
    expect(result.version).toBe(DATABASE_VERSION);
    expect(result.settings.theme).toBe('system');
    expect(result.settings.shortcuts.nextResult).toBe('j');
    expect(result.comparisonCriteria).toEqual([]);
  });

  it('migrates v1 data to v2 adding rejectionReason and comparisonCriteria', () => {
    const v1Data = {
      version: 1,
      activeProjectId: 'proj-1',
      projects: [{ id: 'proj-1', name: 'Test', status: 'active', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }],
      records: [{
        id: 'rec-1', projectId: 'proj-1', canonicalUrl: 'https://example.com', url: 'https://example.com',
        title: 'Example', snippet: 'A snippet', domain: 'example.com', status: 'keep',
        notes: '', tagIds: [], sourceQueries: [], createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z'
      }],
      tags: [],
      settings: {
        theme: 'dark',
        rejectedDisplay: 'fade',
        analyticsEnabled: false,
        onboardingComplete: true,
        paused: false,
        density: 'comfortable',
        plan: 'free',
      },
    };
    const result = migrateDatabase(v1Data);
    expect(result.version).toBe(DATABASE_VERSION);
    expect(result.records[0]!.rejectionReason).toBe('');
    expect(result.comparisonCriteria).toEqual([]);
    expect(result.settings.shortcuts.nextResult).toBe('j');
    expect(result.settings.theme).toBe('dark');
  });
});
