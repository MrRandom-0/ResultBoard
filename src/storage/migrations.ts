import { z } from 'zod';
import { DEFAULT_SETTINGS, DEFAULT_SHORTCUTS, DATABASE_VERSION, emptyDatabase, type StoredDatabase } from '../models/types';
import { storedDatabaseSchema } from '../models/schemas';

const legacySchema = z.object({
  version: z.literal(0),
  activeProjectId: z.string().nullable().default(null),
  projects: z.array(z.unknown()).default([]),
  records: z.array(z.unknown()).default([]),
  tags: z.array(z.unknown()).default([]),
  settings: z.record(z.unknown()).default({})
}).passthrough();

type Migration = (data: unknown) => unknown;
const normalizeLegacyDate = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : new Date(timestamp).toISOString();
};

const normalizeLegacyDates = (items: unknown[]): unknown[] => items.map((item) => {
  if (!item || typeof item !== 'object') return item;
  const record = item as Record<string, unknown>;
  return {
    ...record,
    createdAt: normalizeLegacyDate(record['createdAt']),
    updatedAt: normalizeLegacyDate(record['updatedAt']),
  };
});

const migrations: Record<number, Migration> = {
  0: (data) => {
    const legacy = legacySchema.parse(data);
    return {
      ...legacy,
      version: 1,
      projects: normalizeLegacyDates(legacy.projects),
      records: normalizeLegacyDates(legacy.records),
      settings: { ...DEFAULT_SETTINGS, ...legacy.settings },
    };
  },
  1: (data) => {
    const parsed = z.object({
      version: z.literal(1),
      activeProjectId: z.string().nullable(),
      projects: z.array(z.record(z.unknown())),
      records: z.array(z.record(z.unknown())),
      tags: z.array(z.record(z.unknown())),
      settings: z.record(z.unknown())
    }).passthrough().parse(data);

    const records = parsed.records.map((record) => ({
      ...record,
      rejectionReason: ''
    }));

    const settings = {
      ...parsed.settings,
      shortcuts: { ...DEFAULT_SHORTCUTS, ...(typeof parsed.settings['shortcuts'] === 'object' && parsed.settings['shortcuts'] !== null ? parsed.settings['shortcuts'] : {}) }
    };

    return {
      ...parsed,
      version: 2,
      records,
      comparisonCriteria: [],
      settings
    };
  },
  2: (data) => {
    const parsed = z.object({
      version: z.literal(2),
      records: z.array(z.record(z.unknown()))
    }).passthrough().parse(data);
    return {
      ...parsed,
      version: 3,
      records: parsed.records.map((record) => ({ ...record, criterionScores: {} }))
    };
  },
  3: (data) => {
    const parsed = z.object({
      version: z.literal(3),
      settings: z.record(z.unknown())
    }).passthrough().parse(data);
    const obsolete = new Set(['analyticsEnabled', 'plan', 'backupReminder', 'developerMode']);
    return {
      ...parsed,
      version: 4,
      settings: Object.fromEntries(Object.entries(parsed.settings).filter(([key]) => !obsolete.has(key)))
    };
  }
};

class ResultBoardMigrationError extends Error {
  override readonly name = 'MigrationError';
}

export { ResultBoardMigrationError as MigrationError };

export function migrateDatabase(input: unknown): StoredDatabase {
  if (input === undefined || input === null) return emptyDatabase();
  try {
    const version = z.object({ version: z.number().int().nonnegative() }).passthrough().parse(input).version;
    if (version > DATABASE_VERSION) throw new ResultBoardMigrationError('Data was created by a newer ResultBoard version.');
    let current: unknown = input;
    for (let next = version; next < DATABASE_VERSION; next += 1) {
      const migration = migrations[next];
      if (!migration) throw new ResultBoardMigrationError(`Missing migration from version ${next}.`);
      current = migration(current);
    }
    return storedDatabaseSchema.parse(current);
  } catch (error) {
    if (error instanceof ResultBoardMigrationError) throw error;
    throw new ResultBoardMigrationError(`Could not safely read ResultBoard data: ${error instanceof Error ? error.message : 'invalid data'}`);
  }
}
