import { z } from 'zod';
import { resultStatusSchema, settingsSchema } from '../models/schemas';
import type { StoredDatabase } from '../models/types';

const userSettingsPatchSchema = settingsSchema.partial();

const parsedResultSchema = z.object({
  url: z.string().url(),
  canonicalUrl: z.string().url(),
  title: z.string().min(1).max(500),
  snippet: z.string().max(2000),
  domain: z.string().min(1).max(253),
  sourceQuery: z.string().max(500)
}).strict();

export const requestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('GET_STATE') }).strict(),
  z.object({ type: z.literal('CREATE_PROJECT'), name: z.string() }).strict(),
  z.object({ type: z.literal('SWITCH_PROJECT'), projectId: z.string() }).strict(),
  z.object({ type: z.literal('RENAME_PROJECT'), projectId: z.string(), name: z.string() }).strict(),
  z.object({ type: z.literal('ARCHIVE_PROJECT'), projectId: z.string() }).strict(),
  z.object({ type: z.literal('UNARCHIVE_PROJECT'), projectId: z.string() }).strict(),
  z.object({ type: z.literal('CLASSIFY_RESULT'), result: parsedResultSchema, status: resultStatusSchema, rejectionReason: z.string().max(500).optional() }).strict(),
  z.object({ type: z.literal('BULK_CLASSIFY'), recordIds: z.array(z.string()).min(1).max(500), status: resultStatusSchema, rejectionReason: z.string().max(500).optional() }).strict(),
  z.object({ type: z.literal('UPDATE_RECORD'), recordId: z.string(), patch: z.object({ status: resultStatusSchema.optional(), notes: z.string().optional(), tagIds: z.array(z.string()).optional(), rejectionReason: z.string().max(500).optional(), criterionScores: z.record(z.string(), z.number().min(0).max(5)).optional() }).strict() }).strict(),
  z.object({ type: z.literal('REMOVE_RECORD'), recordId: z.string() }).strict(),
  z.object({ type: z.literal('CREATE_TAG'), projectId: z.string(), name: z.string(), color: z.string() }).strict(),
  z.object({ type: z.literal('UPDATE_TAG'), tagId: z.string(), patch: z.object({ name: z.string().optional(), color: z.string().optional() }).strict() }).strict(),
  z.object({ type: z.literal('REMOVE_TAG'), tagId: z.string() }).strict(),
  z.object({ type: z.literal('CREATE_CRITERION'), projectId: z.string(), name: z.string(), weight: z.number().min(0).max(100) }).strict(),
  z.object({ type: z.literal('UPDATE_CRITERION'), criterionId: z.string(), patch: z.object({ name: z.string().optional(), weight: z.number().min(0).max(100).optional() }).strict() }).strict(),
  z.object({ type: z.literal('REMOVE_CRITERION'), criterionId: z.string() }).strict(),
  z.object({ type: z.literal('UPDATE_SETTINGS'), patch: userSettingsPatchSchema }).strict(),
  z.object({ type: z.literal('IMPORT_DATABASE'), data: z.unknown(), mode: z.enum(['merge', 'replace']) }).strict(),
  z.object({ type: z.literal('DELETE_ALL') }).strict()
]);

export type RuntimeRequest = z.infer<typeof requestSchema>;
export type RuntimeResponse =
  | { ok: true; data: StoredDatabase; warnings?: string[] }
  | { ok: false; error: { code: string; message: string } };
