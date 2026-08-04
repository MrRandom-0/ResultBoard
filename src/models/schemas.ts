import { z } from 'zod';
import { DATABASE_VERSION } from './types';

const isoDate = z.string().datetime();
const id = z.string().min(1).max(128);

export const projectSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  status: z.enum(['active', 'archived']),
  createdAt: isoDate,
  updatedAt: isoDate
}).strict();

export const tagSchema = z.object({
  id,
  projectId: id,
  name: z.string().trim().min(1).max(32),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  createdAt: isoDate
}).strict();

export const comparisonCriterionSchema = z.object({
  id,
  projectId: id,
  name: z.string().trim().min(1).max(80),
  weight: z.number().min(0).max(100)
}).strict();

export const resultStatusSchema = z.enum(['keep', 'maybe', 'reject']);

export const searchResultSchema = z.object({
  id,
  projectId: id,
  canonicalUrl: z.string().url().max(4096),
  url: z.string().url().max(4096),
  title: z.string().min(1).max(500),
  snippet: z.string().max(2000),
  domain: z.string().min(1).max(253),
  status: resultStatusSchema,
  rejectionReason: z.string().max(500),
  notes: z.string().max(10_000),
  tagIds: z.array(id).max(50),
  criterionScores: z.record(id, z.number().min(0).max(5)).default({}),
  sourceQueries: z.array(z.string().max(500)).max(100),
  createdAt: isoDate,
  updatedAt: isoDate
}).strict();

export const keyboardShortcutsSchema = z.object({
  nextResult: z.string().min(1).max(20),
  prevResult: z.string().min(1).max(20),
  keepResult: z.string().min(1).max(20),
  maybeResult: z.string().min(1).max(20),
  rejectResult: z.string().min(1).max(20),
  openBoard: z.string().min(1).max(20),
  togglePanel: z.string().min(1).max(20)
}).strict();

export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  rejectedDisplay: z.enum(['fade', 'hide', 'show']),
  onboardingComplete: z.boolean(),
  paused: z.boolean(),
  density: z.enum(['comfortable', 'compact']),
  shortcuts: keyboardShortcutsSchema,
  fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  animationSpeed: z.enum(['none', 'reduced', 'normal']).default('normal'),
  autoArchiveDays: z.number().int().min(0).max(365).default(0),
  maxResultsWarning: z.number().int().min(10).max(10000).default(500)
}).strict();

export const storedDatabaseSchema = z.object({
  version: z.number().int().min(0).max(DATABASE_VERSION),
  activeProjectId: id.nullable(),
  projects: z.array(projectSchema),
  records: z.array(searchResultSchema),
  tags: z.array(tagSchema),
  comparisonCriteria: z.array(comparisonCriterionSchema),
  settings: settingsSchema
}).strict();

export type ValidStoredDatabase = z.infer<typeof storedDatabaseSchema>;
