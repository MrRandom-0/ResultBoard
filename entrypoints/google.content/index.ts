import { defineContentScript } from 'wxt/sandbox';
import { findOrganicResults, type GoogleResultMatch } from '../../src/adapters/google-search';
import { sendMessage, sendMessageWithMeta } from '../../src/messaging/client';
import type { ResultStatus, StoredDatabase } from '../../src/models/types';
import { throttle } from '../../src/utils/performance';
import { matchesShortcut } from '../../src/utils/shortcuts';
import css from './style.css?inline';

const HOST_ATTR = 'data-resultboard-controls';
let state: StoredDatabase | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let focusedIndex = -1;
let keyboardNavEnabled = false;

function recordFor(match: GoogleResultMatch) {
  return state?.records.find(
    (record) =>
      record.projectId === state?.activeProjectId &&
      record.canonicalUrl === match.result.canonicalUrl
  );
}

function showToast(message: string, undo?: () => Promise<void>): void {
  document.querySelector('#resultboard-toast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'resultboard-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  if (undo) {
    const button = document.createElement('button');
    button.textContent = 'Undo';
    button.addEventListener('click', () => {
      void undo().finally(() => toast.remove());
    });
    toast.append(button);
  }
  document.body.append(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.remove(), 4500);
}

function promptRejectionReason(match: GoogleResultMatch, container: HTMLElement): void {
  const existing = container.querySelector('.resultboard-reject-input');
  if (existing) {
    existing.remove();
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'resultboard-reject-input';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Reason for rejecting (optional)';
  input.maxLength = 500;

  const submit = document.createElement('button');
  submit.textContent = 'Reject';
  submit.addEventListener('click', () => {
    void classify(match, 'reject', input.value.trim());
    wrapper.remove();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      void classify(match, 'reject', input.value.trim());
      wrapper.remove();
    }
    if (e.key === 'Escape') {
      wrapper.remove();
    }
  });

  wrapper.append(input, submit);
  container.append(wrapper);
  input.focus();
}

async function classify(
  match: GoogleResultMatch,
  status: ResultStatus,
  rejectionReason?: string
): Promise<void> {
  if (!state?.activeProjectId) {
    showToast('Create a project in ResultBoard first.');
    return;
  }
  const previous = recordFor(match)?.status;
  try {
    const response = await sendMessageWithMeta({
      type: 'CLASSIFY_RESULT',
      result: match.result,
      status,
      rejectionReason: rejectionReason || undefined,
    });
    state = response.data;
    injectAll();
    showToast(
      response.warnings[0] ?? (status === 'reject' ? 'Result rejected.' : `Saved to ${state.projects.find((p) => p.id === state?.activeProjectId)?.name ?? 'project'}.`),
      async () => {
        if (previous) state = await sendMessage({ type: 'CLASSIFY_RESULT', result: match.result, status: previous });
        else {
          const created = recordFor(match);
          if (created) state = await sendMessage({ type: 'REMOVE_RECORD', recordId: created.id });
        }
        injectAll();
      }
    );
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Could not save this result.');
  }
}

function renderControls(match: GoogleResultMatch): void {
  let host = match.container.querySelector<HTMLElement>(`:scope > [${HOST_ATTR}]`);
  if (!host) {
    host = document.createElement('div');
    host.setAttribute(HOST_ATTR, '');
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = css;
    shadow.append(style, document.createElement('div'));
    match.container.append(host);
  }
  const root = host.shadowRoot?.querySelector('div');
  if (!root) return;
  const record = recordFor(match);
  match.container.toggleAttribute(
    'data-resultboard-rejected',
    record?.status === 'reject' && state?.settings.rejectedDisplay === 'fade'
  );
  match.container.toggleAttribute(
    'data-resultboard-hidden',
    record?.status === 'reject' && state?.settings.rejectedDisplay === 'hide'
  );
  root.replaceChildren();
  root.className = 'controls';
  if (record?.status === 'reject') {
    const restore = document.createElement('button');
    restore.className = 'restore';
    restore.textContent = 'Restore';
    restore.title = `Rejected${record.rejectionReason ? ` - ${record.rejectionReason}` : ''}${record.notes ? ` · ${record.notes}` : ''}`;
    restore.addEventListener('click', () => void classify(match, 'maybe'));
    root.append(restore);
    return;
  }
  for (const [status, label] of [
    ['keep', 'Keep'],
    ['maybe', 'Maybe'],
    ['reject', 'Reject'],
  ] as const) {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = record?.status === status ? `active ${status}` : status;
    button.setAttribute('aria-pressed', String(record?.status === status));
    button.title = record
      ? `${record.status} · ${record.notes || 'No notes'} · ${record.sourceQueries.join(', ')}`
      : `${label} in active project`;
    button.addEventListener('click', () => {
      if (status === 'reject') {
        promptRejectionReason(match, root);
      } else {
        void classify(match, status);
      }
    });
    root.append(button);
  }
}

function updateFocusHighlight(): void {
  const results = findOrganicResults();
  results.forEach((match, index) => {
    match.container.classList.toggle('resultboard-kb-focused', keyboardNavEnabled && index === focusedIndex);
  });
}

function injectAll(): void {
  if (state?.settings.paused) {
    document.querySelectorAll(`[${HOST_ATTR}]`).forEach((element) => element.remove());
    document.querySelectorAll('[data-resultboard-rejected], [data-resultboard-hidden], .resultboard-kb-focused').forEach((element) => {
      element.removeAttribute('data-resultboard-rejected');
      element.removeAttribute('data-resultboard-hidden');
      element.classList.remove('resultboard-kb-focused');
    });
    keyboardNavEnabled = false;
    focusedIndex = -1;
    return;
  }
  for (const match of findOrganicResults()) renderControls(match);
  updateFocusHighlight();
}

function setupKeyboardNav(): void {
  document.addEventListener('keydown', (event) => {
    if (!state) return;
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return;
    }

    const shortcuts = state.settings.shortcuts;
    const key = event.key.toLowerCase();
    const results = findOrganicResults();

    if (matchesShortcut(event, shortcuts.nextResult)) {
      event.preventDefault();
      keyboardNavEnabled = true;
      focusedIndex = Math.min(focusedIndex + 1, results.length - 1);
      updateFocusHighlight();
      const focused = results[focusedIndex];
      if (focused) {
        focused.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (matchesShortcut(event, shortcuts.prevResult)) {
      event.preventDefault();
      keyboardNavEnabled = true;
      focusedIndex = Math.max(focusedIndex - 1, 0);
      updateFocusHighlight();
      const focused = results[focusedIndex];
      if (focused) {
        focused.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (key === 'escape') {
      keyboardNavEnabled = false;
      focusedIndex = -1;
      updateFocusHighlight();
      return;
    }

    if (!keyboardNavEnabled || focusedIndex < 0) return;
    const currentMatch = results[focusedIndex];
    if (!currentMatch) return;

    if (matchesShortcut(event, shortcuts.keepResult)) {
      event.preventDefault();
      void classify(currentMatch, 'keep');
      return;
    }

    if (matchesShortcut(event, shortcuts.maybeResult)) {
      event.preventDefault();
      void classify(currentMatch, 'maybe');
      return;
    }

    if (matchesShortcut(event, shortcuts.rejectResult)) {
      event.preventDefault();
      void classify(currentMatch, 'reject');
      return;
    }
  });
}

export default defineContentScript({
  matches: ['https://www.google.com/search*'],
  cssInjectionMode: 'ui',
  async main() {
    try {
      state = await sendMessage({ type: 'GET_STATE' });
    } catch {
      return;
    }

    // Inject host page styles for keyboard navigation focus ring
    const hostStyle = document.createElement('style');
    hostStyle.textContent = `
      .resultboard-kb-focused { outline: 3px solid #496d59 !important; outline-offset: 2px; border-radius: 8px; box-shadow: 0 0 0 5px rgba(73, 109, 89, 0.15); transition: outline 0.15s, box-shadow 0.15s; }
      [data-resultboard-rejected] { opacity: 0.35; transition: opacity 0.2s; }
      [data-resultboard-rejected]:hover { opacity: 1; }
      [data-resultboard-hidden] { display: none !important; }
    `;
    document.head.append(hostStyle);

    injectAll();
    setupKeyboardNav();
    const throttledInjectAll = throttle(() => { injectAll(); }, 16);
    const observer = new MutationObserver(() => {
      throttledInjectAll();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local' || !changes['resultboard.database']) return;
      void sendMessage({ type: 'GET_STATE' }).then((next) => {
        state = next;
        injectAll();
      });
    });
  },
});
