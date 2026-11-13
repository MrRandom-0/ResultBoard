import { defineBackground } from 'wxt/sandbox';
import type { StoredDatabase, UserSettings } from '../src/models/types';
import { requestSchema, type RuntimeResponse } from '../src/messaging/schema';
import { ChromeStorageDriver } from '../src/storage/driver';
import { ResultBoardRepository } from '../src/storage/repository';
import { ResultBoardError, errorMessage } from '../src/utils/errors';
import { getStaleProjectIds } from '../src/utils/auto-archive';

const GOOGLE_SEARCH_PATTERN = 'https://www.google.com/search*';

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}

export default defineBackground(() => {
  const repository = new ResultBoardRepository(new ChromeStorageDriver());

  const runAutoArchive = async (): Promise<void> => {
    const state = await repository.getState();
    for (const projectId of getStaleProjectIds(state)) {
      await repository.archiveProject(projectId).catch(() => undefined);
    }
  };

  chrome.runtime.onInstalled.addListener((details) => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'open-resultboard',
        title: 'Open ResultBoard side panel',
        contexts: ['page'],
        documentUrlPatterns: [GOOGLE_SEARCH_PATTERN],
      });
    });
    void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    void runAutoArchive();

    if (String(details.reason) === 'install') {
      void chrome.tabs.create({ url: chrome.runtime.getURL('/onboarding.html') });
    }
  });

  chrome.runtime.onStartup.addListener(() => {
    void runAutoArchive();
  });

  chrome.contextMenus.onClicked.addListener((_info, tab) => {
    if (tab?.windowId !== undefined) void chrome.sidePanel.open({ windowId: tab.windowId });
  });

  chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-board') {
      void chrome.tabs.create({ url: chrome.runtime.getURL('/board.html') });
      return;
    }
    if (command === 'toggle-keyboard-nav') {
      void repository.getState().then((state) =>
        repository.updateSettings({ paused: !state.settings.paused })
      );
    }
  });

  chrome.runtime.onMessage.addListener((raw: unknown, _sender, sendResponse: (response: RuntimeResponse) => void) => {
    void (async () => {
      try {
        const request = requestSchema.parse(raw);
        let data: StoredDatabase;
        let warnings: string[] | undefined;
        switch (request.type) {
          case 'GET_STATE': data = await repository.getState(); break;
          case 'CREATE_PROJECT': data = await repository.createProject(request.name); break;
          case 'SWITCH_PROJECT': data = await repository.switchProject(request.projectId); break;
          case 'RENAME_PROJECT': data = await repository.renameProject(request.projectId, request.name); break;
          case 'ARCHIVE_PROJECT': data = await repository.archiveProject(request.projectId); break;
          case 'UNARCHIVE_PROJECT': data = await repository.unarchiveProject(request.projectId); break;
          case 'CLASSIFY_RESULT': {
            data = await repository.classify(request.result, request.status, request.rejectionReason);
            if (data.activeProjectId && data.settings.maxResultsWarning > 0) {
              const count = data.records.filter((record) => record.projectId === data.activeProjectId).length;
              if (count === data.settings.maxResultsWarning) {
                warnings = [`This project now has ${count} results. Consider exporting a backup.`];
              }
            }
            break;
          }
          case 'BULK_CLASSIFY': data = await repository.bulkClassify(request.recordIds, request.status, request.rejectionReason); break;
          case 'BULK_UPDATE_TAGS': data = await repository.bulkUpdateTags(request.recordIds, request.tagIds, request.mode); break;
          case 'BULK_REMOVE_RECORDS': data = await repository.bulkRemoveRecords(request.recordIds); break;
          case 'UPDATE_RECORD': data = await repository.updateRecord(request.recordId, withoutUndefined(request.patch)); break;
          case 'REMOVE_RECORD': data = await repository.removeRecord(request.recordId); break;
          case 'CREATE_TAG': data = await repository.createTag(request.projectId, request.name, request.color); break;
          case 'UPDATE_TAG': data = await repository.updateTag(request.tagId, withoutUndefined(request.patch)); break;
          case 'REMOVE_TAG': data = await repository.removeTag(request.tagId); break;
          case 'CREATE_CRITERION': data = await repository.createCriterion(request.projectId, request.name, request.weight); break;
          case 'UPDATE_CRITERION': data = await repository.updateCriterion(request.criterionId, withoutUndefined(request.patch)); break;
          case 'REMOVE_CRITERION': data = await repository.removeCriterion(request.criterionId); break;
          case 'UPDATE_SETTINGS': data = await repository.updateSettings(withoutUndefined(request.patch) as Partial<UserSettings>); break;
          case 'IMPORT_DATABASE': data = await repository.importDatabase(request.data, request.mode); break;
          case 'DELETE_ALL': data = await repository.deleteAll(); break;
        }
        sendResponse(warnings ? { ok: true, data, warnings } : { ok: true, data });
      } catch (error) {
        sendResponse({
          ok: false,
          error: {
            code: error instanceof ResultBoardError ? error.code : 'VALIDATION',
            message: errorMessage(error),
          },
        });
      }
    })();
    return true;
  });
});
