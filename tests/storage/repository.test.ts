import { describe, it, expect, beforeEach } from 'vitest';
import { ResultBoardRepository } from '../../src/storage/repository';
import { MemoryStorageDriver } from '../../src/storage/driver';
import type { ParsedSearchResult } from '../../src/models/types';

describe('ResultBoardRepository', () => {
  let driver: MemoryStorageDriver;
  let repo: ResultBoardRepository;
  let clock: number;

  beforeEach(() => {
    driver = new MemoryStorageDriver();
    clock = Date.UTC(2024, 0, 1);
    repo = new ResultBoardRepository(driver, () => new Date(clock++).toISOString());
  });

  describe('createProject', () => {
    it('creates a project and sets it as active', async () => {
      const state = await repo.createProject('Research');
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0]!.name).toBe('Research');
      expect(state.projects[0]!.status).toBe('active');
      expect(state.activeProjectId).toBe(state.projects[0]!.id);
    });

    it('trims whitespace from project name', async () => {
      const state = await repo.createProject('  My Project  ');
      expect(state.projects[0]!.name).toBe('My Project');
    });

    it('rejects empty names', async () => {
      await expect(repo.createProject('')).rejects.toThrow('1-80');
    });

    it('rejects names over 80 characters', async () => {
      await expect(repo.createProject('a'.repeat(81))).rejects.toThrow('1-80');
    });
  });

  describe('switchProject', () => {
    it('switches active project', async () => {
      await repo.createProject('Project A');
      const stateB = await repo.createProject('Project B');
      const projectA = stateB.projects[0]!;
      const state = await repo.switchProject(projectA.id);
      expect(state.activeProjectId).toBe(projectA.id);
    });

    it('throws when project not found', async () => {
      await expect(repo.switchProject('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('renameProject', () => {
    it('renames an existing project', async () => {
      const created = await repo.createProject('Old Name');
      const projectId = created.projects[0]!.id;
      const state = await repo.renameProject(projectId, 'New Name');
      expect(state.projects[0]!.name).toBe('New Name');
    });

    it('throws for nonexistent project', async () => {
      await expect(repo.renameProject('bad-id', 'Name')).rejects.toThrow('not found');
    });

    it('rejects invalid names', async () => {
      const created = await repo.createProject('Test');
      await expect(repo.renameProject(created.projects[0]!.id, '')).rejects.toThrow('1-80');
    });
  });

  describe('classify', () => {
    const mockResult: ParsedSearchResult = {
      url: 'https://example.com/page?ref=google',
      canonicalUrl: 'https://example.com/page',
      title: 'Example Page',
      snippet: 'A great example page.',
      domain: 'example.com',
      sourceQuery: 'example search',
    };

    it('creates a new record when classifying for the first time', async () => {
      await repo.createProject('Test');
      const state = await repo.classify(mockResult, 'keep');
      expect(state.records).toHaveLength(1);
      expect(state.records[0]!.status).toBe('keep');
      expect(state.records[0]!.title).toBe('Example Page');
      expect(state.records[0]!.sourceQueries).toEqual(['example search']);
    });

    it('upserts duplicate by canonicalUrl (updates status, title, snippet)', async () => {
      await repo.createProject('Test');
      await repo.classify(mockResult, 'keep');
      const updated: ParsedSearchResult = {
        ...mockResult,
        title: 'Updated Title',
        snippet: 'Updated snippet.',
        sourceQuery: 'second query',
      };
      const state = await repo.classify(updated, 'maybe');
      expect(state.records).toHaveLength(1);
      expect(state.records[0]!.status).toBe('maybe');
      expect(state.records[0]!.title).toBe('Updated Title');
      expect(state.records[0]!.sourceQueries).toContain('example search');
      expect(state.records[0]!.sourceQueries).toContain('second query');
    });

    it('throws when no active project exists', async () => {
      await expect(repo.classify(mockResult, 'keep')).rejects.toThrow('Create a project');
    });
  });

  describe('updateRecord', () => {
    it('updates record notes', async () => {
      await repo.createProject('Test');
      const result: ParsedSearchResult = {
        url: 'https://example.com/page',
        canonicalUrl: 'https://example.com/page',
        title: 'Test',
        snippet: '',
        domain: 'example.com',
        sourceQuery: '',
      };
      const classified = await repo.classify(result, 'keep');
      const recordId = classified.records[0]!.id;
      const state = await repo.updateRecord(recordId, { notes: 'My notes' });
      expect(state.records[0]!.notes).toBe('My notes');
    });

    it('updates record status', async () => {
      await repo.createProject('Test');
      const result: ParsedSearchResult = {
        url: 'https://example.com/page',
        canonicalUrl: 'https://example.com/page',
        title: 'Test',
        snippet: '',
        domain: 'example.com',
        sourceQuery: '',
      };
      const classified = await repo.classify(result, 'keep');
      const recordId = classified.records[0]!.id;
      const state = await repo.updateRecord(recordId, { status: 'reject' });
      expect(state.records[0]!.status).toBe('reject');
    });

    it('throws for nonexistent record', async () => {
      await expect(repo.updateRecord('bad-id', { notes: 'test' })).rejects.toThrow('not found');
    });
  });

  describe('removeRecord', () => {
    it('removes a record by ID', async () => {
      await repo.createProject('Test');
      const result: ParsedSearchResult = {
        url: 'https://example.com/page',
        canonicalUrl: 'https://example.com/page',
        title: 'Test',
        snippet: '',
        domain: 'example.com',
        sourceQuery: '',
      };
      const classified = await repo.classify(result, 'keep');
      const recordId = classified.records[0]!.id;
      const state = await repo.removeRecord(recordId);
      expect(state.records).toHaveLength(0);
    });

    it('throws for nonexistent record', async () => {
      await expect(repo.removeRecord('bad-id')).rejects.toThrow('not found');
    });
  });

  describe('createTag', () => {
    it('creates a tag for a project', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const state = await repo.createTag(projectId, 'Important', '#ff0000');
      expect(state.tags).toHaveLength(1);
      expect(state.tags[0]!.name).toBe('Important');
      expect(state.tags[0]!.color).toBe('#ff0000');
    });

    it('does not create duplicate tags (case-insensitive)', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      await repo.createTag(projectId, 'Important', '#ff0000');
      const state = await repo.createTag(projectId, 'IMPORTANT', '#00ff00');
      expect(state.tags).toHaveLength(1);
    });

    it('rejects invalid color format', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      await expect(repo.createTag(projectId, 'Tag', 'red')).rejects.toThrow('Invalid tag color');
    });

    it('rejects tag names over 32 characters', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      await expect(repo.createTag(projectId, 'a'.repeat(33), '#ff0000')).rejects.toThrow('1-32');
    });
  });

  describe('archiveProject', () => {
    it('archives an active project', async () => {
      const created = await repo.createProject('My Project');
      const projectId = created.projects[0]!.id;
      const state = await repo.archiveProject(projectId);
      expect(state.projects[0]!.status).toBe('archived');
    });

    it('switches activeProjectId when archiving current project', async () => {
      const stateA = await repo.createProject('Project A');
      await repo.createProject('Project B');
      // Switch to Project A
      const projectAId = stateA.projects[0]!.id;
      await repo.switchProject(projectAId);
      const state = await repo.archiveProject(projectAId);
      // Active should switch to another active project or null
      expect(state.activeProjectId).not.toBe(projectAId);
    });

    it('sets activeProjectId to null when no active projects remain', async () => {
      const created = await repo.createProject('Solo');
      const projectId = created.projects[0]!.id;
      const state = await repo.archiveProject(projectId);
      expect(state.activeProjectId).toBeNull();
    });

    it('throws for nonexistent project', async () => {
      await expect(repo.archiveProject('bad-id')).rejects.toThrow('not found');
    });

    it('throws for already archived project', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      await repo.archiveProject(projectId);
      await expect(repo.archiveProject(projectId)).rejects.toThrow('not found');
    });
  });

  describe('unarchiveProject', () => {
    it('unarchives a previously archived project', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      await repo.archiveProject(projectId);
      const state = await repo.unarchiveProject(projectId);
      expect(state.projects[0]!.status).toBe('active');
    });

    it('throws for active project', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      await expect(repo.unarchiveProject(projectId)).rejects.toThrow('not found');
    });

    it('throws for nonexistent project', async () => {
      await expect(repo.unarchiveProject('nonexistent')).rejects.toThrow('not found');
    });

    it('restores archived projects without an artificial local limit', async () => {
      await repo.createProject('P1');
      await repo.createProject('P2');
      await repo.createProject('P3');
      // Archive P1
      const state = await repo.getState();
      const p1Id = state.projects[0]!.id;
      await repo.archiveProject(p1Id);
      // Create P4 (should be allowed since only 2 active)
      await repo.createProject('P4');
      const restored = await repo.unarchiveProject(p1Id);
      expect(restored.projects.filter((project) => project.status === 'active')).toHaveLength(4);
    });
  });

  describe('createCriterion', () => {
    it('creates a criterion for a project', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const state = await repo.createCriterion(projectId, 'Relevance', 50);
      expect(state.comparisonCriteria).toHaveLength(1);
      expect(state.comparisonCriteria[0]!.name).toBe('Relevance');
      expect(state.comparisonCriteria[0]!.weight).toBe(50);
      expect(state.comparisonCriteria[0]!.projectId).toBe(projectId);
    });

    it('rejects empty name', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      await expect(repo.createCriterion(projectId, '', 50)).rejects.toThrow('1-80');
    });

    it('rejects name over 80 characters', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      await expect(repo.createCriterion(projectId, 'x'.repeat(81), 50)).rejects.toThrow('1-80');
    });

    it('rejects weight below 0', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      await expect(repo.createCriterion(projectId, 'Speed', -1)).rejects.toThrow('0 and 100');
    });

    it('rejects weight above 100', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      await expect(repo.createCriterion(projectId, 'Speed', 101)).rejects.toThrow('0 and 100');
    });

    it('throws for nonexistent project', async () => {
      await expect(repo.createCriterion('bad-id', 'Test', 50)).rejects.toThrow('not found');
    });
  });

  describe('updateCriterion', () => {
    it('updates criterion name', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const withCriterion = await repo.createCriterion(projectId, 'Old Name', 50);
      const criterionId = withCriterion.comparisonCriteria[0]!.id;
      const state = await repo.updateCriterion(criterionId, { name: 'New Name' });
      expect(state.comparisonCriteria[0]!.name).toBe('New Name');
    });

    it('updates criterion weight', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const withCriterion = await repo.createCriterion(projectId, 'Quality', 30);
      const criterionId = withCriterion.comparisonCriteria[0]!.id;
      const state = await repo.updateCriterion(criterionId, { weight: 80 });
      expect(state.comparisonCriteria[0]!.weight).toBe(80);
    });

    it('throws for nonexistent criterion', async () => {
      await expect(repo.updateCriterion('bad-id', { name: 'Test' })).rejects.toThrow('not found');
    });

    it('rejects invalid name', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const withCriterion = await repo.createCriterion(projectId, 'Valid', 50);
      const criterionId = withCriterion.comparisonCriteria[0]!.id;
      await expect(repo.updateCriterion(criterionId, { name: '' })).rejects.toThrow('1-80');
    });

    it('rejects invalid weight', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const withCriterion = await repo.createCriterion(projectId, 'Valid', 50);
      const criterionId = withCriterion.comparisonCriteria[0]!.id;
      await expect(repo.updateCriterion(criterionId, { weight: 200 })).rejects.toThrow('0 and 100');
    });
  });

  describe('removeCriterion', () => {
    it('removes a criterion by ID', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const withCriterion = await repo.createCriterion(projectId, 'To Remove', 50);
      const criterionId = withCriterion.comparisonCriteria[0]!.id;
      const state = await repo.removeCriterion(criterionId);
      expect(state.comparisonCriteria).toHaveLength(0);
    });

    it('throws for nonexistent criterion', async () => {
      await expect(repo.removeCriterion('bad-id')).rejects.toThrow('not found');
    });
  });

  describe('bulkClassify', () => {
    const mockResult = (id: string): ParsedSearchResult => ({
      url: `https://example.com/${id}`,
      canonicalUrl: `https://example.com/${id}`,
      title: `Page ${id}`,
      snippet: 'snippet',
      domain: 'example.com',
      sourceQuery: 'query',
    });

    it('classifies multiple records at once', async () => {
      await repo.createProject('Test');
      const s1 = await repo.classify(mockResult('a'), 'maybe');
      const s2 = await repo.classify(mockResult('b'), 'maybe');
      const ids = [s1.records[0]!.id, s2.records[1]!.id];
      const state = await repo.bulkClassify(ids, 'keep');
      expect(state.records.every((r) => r.status === 'keep')).toBe(true);
    });

    it('sets rejection reason when bulk rejecting', async () => {
      await repo.createProject('Test');
      const s1 = await repo.classify(mockResult('a'), 'keep');
      const ids = [s1.records[0]!.id];
      const state = await repo.bulkClassify(ids, 'reject', 'Not relevant');
      expect(state.records[0]!.rejectionReason).toBe('Not relevant');
    });

    it('throws for empty record IDs array', async () => {
      await expect(repo.bulkClassify([], 'keep')).rejects.toThrow('No records');
    });

    it('throws for more than 500 records', async () => {
      const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);
      await expect(repo.bulkClassify(ids, 'keep')).rejects.toThrow('500');
    });

    it('ignores nonexistent record IDs silently', async () => {
      await repo.createProject('Test');
      const s1 = await repo.classify(mockResult('a'), 'maybe');
      const ids = [s1.records[0]!.id, 'nonexistent-id'];
      const state = await repo.bulkClassify(ids, 'keep');
      expect(state.records[0]!.status).toBe('keep');
    });
  });

  describe('updateTag', () => {
    it('updates tag name', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const withTag = await repo.createTag(projectId, 'Old Tag', '#ff0000');
      const tagId = withTag.tags[0]!.id;
      const state = await repo.updateTag(tagId, { name: 'New Tag' });
      expect(state.tags[0]!.name).toBe('New Tag');
    });

    it('updates tag color', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const withTag = await repo.createTag(projectId, 'Tag', '#ff0000');
      const tagId = withTag.tags[0]!.id;
      const state = await repo.updateTag(tagId, { color: '#00ff00' });
      expect(state.tags[0]!.color).toBe('#00ff00');
    });

    it('throws for nonexistent tag', async () => {
      await expect(repo.updateTag('bad-id', { name: 'New' })).rejects.toThrow('not found');
    });

    it('rejects invalid tag name', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const withTag = await repo.createTag(projectId, 'Valid', '#ff0000');
      const tagId = withTag.tags[0]!.id;
      await expect(repo.updateTag(tagId, { name: '' })).rejects.toThrow('1-32');
    });

    it('rejects invalid tag color', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const withTag = await repo.createTag(projectId, 'Tag', '#ff0000');
      const tagId = withTag.tags[0]!.id;
      await expect(repo.updateTag(tagId, { color: 'not-a-color' })).rejects.toThrow('Invalid tag color');
    });

    it('prevents duplicate tag names in same project', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      await repo.createTag(projectId, 'Alpha', '#ff0000');
      const withBeta = await repo.createTag(projectId, 'Beta', '#00ff00');
      const betaId = withBeta.tags[1]!.id;
      await expect(repo.updateTag(betaId, { name: 'Alpha' })).rejects.toThrow('already exists');
    });
  });

  describe('removeTag', () => {
    it('removes a tag by ID', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const withTag = await repo.createTag(projectId, 'To Remove', '#ff0000');
      const tagId = withTag.tags[0]!.id;
      const state = await repo.removeTag(tagId);
      expect(state.tags).toHaveLength(0);
    });

    it('removes tag references from records', async () => {
      const created = await repo.createProject('Test');
      const projectId = created.projects[0]!.id;
      const withTag = await repo.createTag(projectId, 'Tag', '#ff0000');
      const tagId = withTag.tags[0]!.id;

      const result: ParsedSearchResult = {
        url: 'https://example.com',
        canonicalUrl: 'https://example.com',
        title: 'Test',
        snippet: '',
        domain: 'example.com',
        sourceQuery: '',
      };
      await repo.classify(result, 'keep');
      const classified = await repo.getState();
      const recordId = classified.records[0]!.id;
      await repo.updateRecord(recordId, { tagIds: [tagId] });

      const state = await repo.removeTag(tagId);
      expect(state.records[0]!.tagIds).not.toContain(tagId);
    });

    it('throws for nonexistent tag', async () => {
      await expect(repo.removeTag('bad-id')).rejects.toThrow('not found');
    });
  });

  describe('classify with rejectionReason', () => {
    const mockResult: ParsedSearchResult = {
      url: 'https://example.com/page',
      canonicalUrl: 'https://example.com/page',
      title: 'Test',
      snippet: '',
      domain: 'example.com',
      sourceQuery: '',
    };

    it('stores rejection reason when rejecting', async () => {
      await repo.createProject('Test');
      const state = await repo.classify(mockResult, 'reject', 'Not relevant');
      expect(state.records[0]!.rejectionReason).toBe('Not relevant');
    });

    it('clears rejection reason when status is not reject', async () => {
      await repo.createProject('Test');
      await repo.classify(mockResult, 'reject', 'Some reason');
      const state = await repo.classify(mockResult, 'keep');
      expect(state.records[0]!.rejectionReason).toBe('');
    });

    it('truncates rejection reason to 500 characters', async () => {
      await repo.createProject('Test');
      const longReason = 'x'.repeat(600);
      const state = await repo.classify(mockResult, 'reject', longReason);
      expect(state.records[0]!.rejectionReason.length).toBe(500);
    });
  });

  describe('updateSettings', () => {
    it('merges partial settings', async () => {
      const state = await repo.updateSettings({ theme: 'dark' });
      expect(state.settings.theme).toBe('dark');
      expect(state.settings.density).toBe('comfortable'); // unchanged
    });
  });

  describe('deleteAll', () => {
    it('resets database to empty state', async () => {
      await repo.createProject('Test');
      const state = await repo.deleteAll();
      expect(state.projects).toHaveLength(0);
      expect(state.records).toHaveLength(0);
      expect(state.activeProjectId).toBeNull();
    });
  });

  describe('importDatabase', () => {
    it('merges backup entities without deleting local projects', async () => {
      const local = await repo.createProject('Local');
      const imported = {
        ...local,
        activeProjectId: 'imported-project',
        projects: [{
          id: 'imported-project',
          name: 'Imported',
          status: 'active' as const,
          createdAt: '2024-02-01T00:00:00.000Z',
          updatedAt: '2024-02-01T00:00:00.000Z',
        }],
        records: [],
      };
      const state = await repo.importDatabase(imported, 'merge');
      expect(state.projects.map((project) => project.name)).toEqual(['Local', 'Imported']);
      expect(state.activeProjectId).toBe(local.activeProjectId);
    });

    it('replaces all entities in replace mode', async () => {
      const local = await repo.createProject('Local');
      const imported = {
        ...local,
        activeProjectId: 'replacement',
        projects: [{
          id: 'replacement',
          name: 'Replacement',
          status: 'active' as const,
          createdAt: '2024-02-01T00:00:00.000Z',
          updatedAt: '2024-02-01T00:00:00.000Z',
        }],
        records: [],
      };
      const state = await repo.importDatabase(imported, 'replace');
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0]?.name).toBe('Replacement');
      expect(state.activeProjectId).toBe('replacement');
    });
  });

  describe('local project capacity', () => {
    it('allows more than three active projects', async () => {
      await repo.createProject('Project 1');
      await repo.createProject('Project 2');
      await repo.createProject('Project 3');
      const state = await repo.createProject('Project 4');
      expect(state.projects.filter((project) => project.status === 'active')).toHaveLength(4);
    });
  });

  describe('comparison ratings', () => {
    it('stores validated per-criterion ratings on a result', async () => {
      const created = await repo.createProject('Compare');
      const projectId = created.activeProjectId!;
      const withCriterion = await repo.createCriterion(projectId, 'Credibility', 70);
      const criterionId = withCriterion.comparisonCriteria[0]!.id;
      const classified = await repo.classify({
        url: 'https://example.com',
        canonicalUrl: 'https://example.com/',
        title: 'Example',
        snippet: '',
        domain: 'example.com',
        sourceQuery: 'example',
      }, 'keep');
      const recordId = classified.records[0]!.id;
      const state = await repo.updateRecord(recordId, { criterionScores: { [criterionId]: 4, unknown: 5 } });
      expect(state.records[0]!.criterionScores).toEqual({ [criterionId]: 4 });
    });
  });
});
