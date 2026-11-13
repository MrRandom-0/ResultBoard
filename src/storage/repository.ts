import type { ParsedSearchResult, ResultStatus, StoredDatabase, UserSettings } from '../models/types';
import { emptyDatabase } from '../models/types';
import { migrateDatabase } from './migrations';
import type { StorageDriver } from './driver';
import { createId } from '../utils/id';
import { ResultBoardError } from '../utils/errors';
import { applyTagIds, tagChangeApplies, type TagChangeMode } from '../utils/bulk';

const STORAGE_KEY = 'resultboard.database';

export class ResultBoardRepository {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly driver: StorageDriver, private readonly now = () => new Date().toISOString()) {}

  private touchProject(state: StoredDatabase, projectId: string, timestamp = this.now()): void {
    const project = state.projects.find((item) => item.id === projectId);
    if (project) project.updatedAt = timestamp;
  }

  async getState(): Promise<StoredDatabase> {
    return migrateDatabase(await this.driver.get(STORAGE_KEY));
  }

  // `action` optionally labels the mutation (e.g. 'DELETE_ALL') for callers that
  // name their operations after the message that triggered them. It is accepted
  // for diagnostics/future history use; mutate itself does not act on it.
  private async mutate(operation: (state: StoredDatabase) => void, action?: string): Promise<StoredDatabase> {
    void action;
    let result: StoredDatabase | undefined;
    const task = this.queue.then(async () => {
      const state = await this.getState();
      operation(state);
      await this.driver.set(STORAGE_KEY, state);
      result = state;
    });
    this.queue = task.catch(() => undefined);
    await task;
    if (!result) throw new ResultBoardError('The update could not be saved.', 'STORAGE');
    return result;
  }

  async createProject(name: string): Promise<StoredDatabase> {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 80) throw new ResultBoardError('Project names must be 1-80 characters.', 'VALIDATION');
    return this.mutate((state) => {
      const timestamp = this.now();
      const project = { id: createId(), name: cleanName, status: 'active' as const, createdAt: timestamp, updatedAt: timestamp };
      state.projects.push(project);
      state.activeProjectId = project.id;
    });
  }

  async switchProject(projectId: string): Promise<StoredDatabase> {
    return this.mutate((state) => {
      if (!state.projects.some((project) => project.id === projectId && project.status === 'active')) throw new ResultBoardError('Project not found.', 'NOT_FOUND');
      state.activeProjectId = projectId;
    });
  }

  async renameProject(projectId: string, name: string): Promise<StoredDatabase> {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 80) throw new ResultBoardError('Project names must be 1-80 characters.', 'VALIDATION');
    return this.mutate((state) => {
      const project = state.projects.find((item) => item.id === projectId);
      if (!project) throw new ResultBoardError('Project not found.', 'NOT_FOUND');
      project.name = cleanName;
      project.updatedAt = this.now();
    });
  }

  async archiveProject(projectId: string): Promise<StoredDatabase> {
    return this.mutate((state) => {
      const project = state.projects.find((item) => item.id === projectId && item.status === 'active');
      if (!project) throw new ResultBoardError('Project not found.', 'NOT_FOUND');
      project.status = 'archived';
      project.updatedAt = this.now();
      if (state.activeProjectId === projectId) {
        const nextActive = state.projects.find((p) => p.status === 'active');
        state.activeProjectId = nextActive ? nextActive.id : null;
      }
    });
  }

  async unarchiveProject(projectId: string): Promise<StoredDatabase> {
    return this.mutate((state) => {
      const project = state.projects.find((item) => item.id === projectId && item.status === 'archived');
      if (!project) throw new ResultBoardError('Project not found.', 'NOT_FOUND');
      project.status = 'active';
      project.updatedAt = this.now();
    });
  }

  async classify(result: ParsedSearchResult, status: ResultStatus, rejectionReason?: string): Promise<StoredDatabase> {
    return this.mutate((state) => {
      const projectId = state.activeProjectId;
      if (!projectId) throw new ResultBoardError('Create a project before saving results.', 'NOT_FOUND');
      const existing = state.records.find((record) => record.projectId === projectId && record.canonicalUrl === result.canonicalUrl);
      const timestamp = this.now();
      const reason = status === 'reject' ? (rejectionReason ?? '').slice(0, 500) : '';
      if (existing) {
        existing.status = status;
        existing.rejectionReason = reason;
        existing.title = result.title;
        existing.snippet = result.snippet;
        existing.url = result.url;
        existing.updatedAt = timestamp;
        if (result.sourceQuery && !existing.sourceQueries.includes(result.sourceQuery)) existing.sourceQueries.push(result.sourceQuery);
      } else {
        state.records.push({
          id: createId(), projectId, canonicalUrl: result.canonicalUrl, url: result.url, title: result.title,
          snippet: result.snippet, domain: result.domain, status, rejectionReason: reason, notes: '', tagIds: [], criterionScores: {},
          sourceQueries: result.sourceQuery ? [result.sourceQuery] : [], createdAt: timestamp, updatedAt: timestamp
        });
      }
      this.touchProject(state, projectId, timestamp);
    });
  }

  async bulkClassify(recordIds: string[], status: ResultStatus, rejectionReason?: string): Promise<StoredDatabase> {
    if (recordIds.length === 0) throw new ResultBoardError('No records specified.', 'VALIDATION');
    if (recordIds.length > 500) throw new ResultBoardError('Cannot bulk classify more than 500 records at once.', 'VALIDATION');
    return this.mutate((state) => {
      const reason = status === 'reject' ? (rejectionReason ?? '').slice(0, 500) : '';
      const timestamp = this.now();
      for (const recordId of recordIds) {
        const record = state.records.find((item) => item.id === recordId);
        if (record) {
          record.status = status;
          record.rejectionReason = reason;
          record.updatedAt = timestamp;
          this.touchProject(state, record.projectId, timestamp);
        }
      }
    });
  }

  async bulkUpdateTags(recordIds: string[], tagIds: string[], mode: TagChangeMode): Promise<StoredDatabase> {
    if (recordIds.length === 0) throw new ResultBoardError('No records specified.', 'VALIDATION');
    if (recordIds.length > 500) throw new ResultBoardError('Cannot update tags for more than 500 records at once.', 'VALIDATION');
    if (tagIds.length === 0) throw new ResultBoardError('No tags specified.', 'VALIDATION');
    return this.mutate((state) => {
      const timestamp = this.now();
      for (const recordId of recordIds) {
        const record = state.records.find((item) => item.id === recordId);
        if (!record) continue;
        // Match updateRecord semantics: only tags belonging to the record's
        // own project may ever land on it.
        const validTagIds = tagIds.filter((tagId) => state.tags.some((tag) => tag.id === tagId && tag.projectId === record.projectId));
        if (!tagChangeApplies(record.tagIds, validTagIds, mode)) continue;
        record.tagIds = applyTagIds(record.tagIds, validTagIds, mode);
        record.updatedAt = timestamp;
        this.touchProject(state, record.projectId, timestamp);
      }
    });
  }

  async bulkRemoveRecords(recordIds: string[]): Promise<StoredDatabase> {
    if (recordIds.length === 0) throw new ResultBoardError('No records specified.', 'VALIDATION');
    if (recordIds.length > 500) throw new ResultBoardError('Cannot remove more than 500 records at once.', 'VALIDATION');
    return this.mutate((state) => {
      const ids = new Set(recordIds);
      const removedProjectIds = new Set<string>();
      state.records = state.records.filter((record) => {
        if (!ids.has(record.id)) return true;
        removedProjectIds.add(record.projectId);
        return false;
      });
      for (const projectId of removedProjectIds) this.touchProject(state, projectId);
    });
  }

  async updateRecord(recordId: string, patch: { status?: ResultStatus | undefined; notes?: string | undefined; tagIds?: string[] | undefined; rejectionReason?: string | undefined; criterionScores?: Record<string, number> | undefined }): Promise<StoredDatabase> {
    return this.mutate((state) => {
      const record = state.records.find((item) => item.id === recordId);
      if (!record) throw new ResultBoardError('Result not found.', 'NOT_FOUND');
      if (patch.notes !== undefined) {
        if (patch.notes.length > 10_000) throw new ResultBoardError('Notes must be under 10,000 characters.', 'VALIDATION');
        record.notes = patch.notes;
      }
      if (patch.status !== undefined) record.status = patch.status;
      if (patch.rejectionReason !== undefined) record.rejectionReason = patch.rejectionReason.slice(0, 500);
      if (patch.tagIds !== undefined) record.tagIds = [...new Set(patch.tagIds.filter((tagId) => state.tags.some((tag) => tag.id === tagId && tag.projectId === record.projectId)))];
      if (patch.criterionScores !== undefined) {
        record.criterionScores = Object.fromEntries(
          Object.entries(patch.criterionScores).filter(([criterionId, score]) =>
            state.comparisonCriteria.some((criterion) => criterion.id === criterionId && criterion.projectId === record.projectId)
            && score >= 0
            && score <= 5
          )
        );
      }
      record.updatedAt = this.now();
      this.touchProject(state, record.projectId, record.updatedAt);
    });
  }

  async removeRecord(recordId: string): Promise<StoredDatabase> {
    return this.mutate((state) => {
      const index = state.records.findIndex((item) => item.id === recordId);
      if (index < 0) throw new ResultBoardError('Result not found.', 'NOT_FOUND');
      const [removed] = state.records.splice(index, 1);
      if (removed) this.touchProject(state, removed.projectId);
    });
  }

  async createTag(projectId: string, name: string, color: string): Promise<StoredDatabase> {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 32) throw new ResultBoardError('Tag names must be 1-32 characters.', 'VALIDATION');
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new ResultBoardError('Invalid tag color.', 'VALIDATION');
    return this.mutate((state) => {
      if (!state.projects.some((project) => project.id === projectId)) throw new ResultBoardError('Project not found.', 'NOT_FOUND');
      const existing = state.tags.find((tag) => tag.projectId === projectId && tag.name.toLowerCase() === cleanName.toLowerCase());
      if (!existing) state.tags.push({ id: createId(), projectId, name: cleanName, color, createdAt: this.now() });
      this.touchProject(state, projectId);
    });
  }

  async updateTag(tagId: string, patch: { name?: string | undefined; color?: string | undefined }): Promise<StoredDatabase> {
    return this.mutate((state) => {
      const tag = state.tags.find((item) => item.id === tagId);
      if (!tag) throw new ResultBoardError('Tag not found.', 'NOT_FOUND');
      if (patch.name !== undefined) {
        const cleanName = patch.name.trim();
        if (!cleanName || cleanName.length > 32) throw new ResultBoardError('Tag names must be 1-32 characters.', 'VALIDATION');
        const duplicate = state.tags.find((t) => t.id !== tagId && t.projectId === tag.projectId && t.name.toLowerCase() === cleanName.toLowerCase());
        if (duplicate) throw new ResultBoardError('A tag with this name already exists.', 'VALIDATION');
        tag.name = cleanName;
      }
      if (patch.color !== undefined) {
        if (!/^#[0-9a-f]{6}$/i.test(patch.color)) throw new ResultBoardError('Invalid tag color.', 'VALIDATION');
        tag.color = patch.color;
      }
      this.touchProject(state, tag.projectId);
    });
  }

  async removeTag(tagId: string): Promise<StoredDatabase> {
    return this.mutate((state) => {
      const index = state.tags.findIndex((item) => item.id === tagId);
      if (index < 0) throw new ResultBoardError('Tag not found.', 'NOT_FOUND');
      const tag = state.tags[index]!;
      state.tags.splice(index, 1);
      for (const record of state.records) {
        if (record.projectId === tag.projectId) {
          record.tagIds = record.tagIds.filter((id) => id !== tagId);
        }
      }
      this.touchProject(state, tag.projectId);
    });
  }

  async createCriterion(projectId: string, name: string, weight: number): Promise<StoredDatabase> {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 80) throw new ResultBoardError('Criterion names must be 1-80 characters.', 'VALIDATION');
    if (weight < 0 || weight > 100) throw new ResultBoardError('Weight must be between 0 and 100.', 'VALIDATION');
    return this.mutate((state) => {
      if (!state.projects.some((project) => project.id === projectId)) throw new ResultBoardError('Project not found.', 'NOT_FOUND');
      state.comparisonCriteria.push({ id: createId(), projectId, name: cleanName, weight });
      this.touchProject(state, projectId);
    });
  }

  async updateCriterion(criterionId: string, patch: { name?: string | undefined; weight?: number | undefined }): Promise<StoredDatabase> {
    return this.mutate((state) => {
      const criterion = state.comparisonCriteria.find((item) => item.id === criterionId);
      if (!criterion) throw new ResultBoardError('Criterion not found.', 'NOT_FOUND');
      if (patch.name !== undefined) {
        const cleanName = patch.name.trim();
        if (!cleanName || cleanName.length > 80) throw new ResultBoardError('Criterion names must be 1-80 characters.', 'VALIDATION');
        criterion.name = cleanName;
      }
      if (patch.weight !== undefined) {
        if (patch.weight < 0 || patch.weight > 100) throw new ResultBoardError('Weight must be between 0 and 100.', 'VALIDATION');
        criterion.weight = patch.weight;
      }
      this.touchProject(state, criterion.projectId);
    });
  }

  async removeCriterion(criterionId: string): Promise<StoredDatabase> {
    return this.mutate((state) => {
      const index = state.comparisonCriteria.findIndex((item) => item.id === criterionId);
      if (index < 0) throw new ResultBoardError('Criterion not found.', 'NOT_FOUND');
      const [removed] = state.comparisonCriteria.splice(index, 1);
      if (removed) this.touchProject(state, removed.projectId);
    });
  }

  async updateSettings(patch: Partial<UserSettings>): Promise<StoredDatabase> {
    return this.mutate((state) => { state.settings = { ...state.settings, ...patch }; });
  }

  async importDatabase(data: unknown, mode: 'merge' | 'replace'): Promise<StoredDatabase> {
    const migrated = migrateDatabase(data);
    return this.mutate((state) => {
      if (mode === 'replace') {
        Object.assign(state, structuredClone(migrated));
        return;
      }

      const mergeById = <T extends { id: string }>(local: T[], incoming: T[]): T[] => {
        const merged = new Map(local.map((item) => [item.id, item]));
        for (const item of incoming) merged.set(item.id, item);
        return [...merged.values()];
      };
      state.projects = mergeById(state.projects, migrated.projects);
      state.records = mergeById(state.records, migrated.records);
      state.tags = mergeById(state.tags, migrated.tags);
      state.comparisonCriteria = mergeById(state.comparisonCriteria, migrated.comparisonCriteria);
      if (!state.activeProjectId) state.activeProjectId = migrated.activeProjectId;
    });
  }

  async deleteAll(): Promise<StoredDatabase> {
    return this.mutate((state) => Object.assign(state, emptyDatabase()), 'DELETE_ALL');
  }
}
