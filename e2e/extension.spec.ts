import { test, expect, type BrowserContext, chromium } from '@playwright/test';
import path from 'node:path';

/**
 * E2E tests for basic extension loading and navigation.
 * These tests use Playwright with a Chrome extension loaded in development mode.
 * 
 * To run locally:
 *   1. Build the extension: npm run build
 *   2. Run tests: npx playwright test e2e/extension.spec.ts
 *
 * Note: Chrome extensions require a persistent context with the extension path.
 */

const EXTENSION_PATH = path.resolve(import.meta.dirname, '..', '.output', 'chrome-mv3');

async function createExtensionContext(): Promise<BrowserContext> {
  return chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-default-apps',
    ],
  });
}

test.describe('Extension basic loading', () => {
  test.describe.configure({ mode: 'serial' });
  let context: BrowserContext;

  test.beforeAll(async () => {
    context = await createExtensionContext();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('extension loads without errors', async () => {
    // Get the background service worker
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    expect(background).toBeTruthy();
  });

  test('popup page opens and renders', async () => {
    // Get extension ID from service worker URL
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');

    await expect(popupPage.getByText('ResultBoard', { exact: true })).toBeVisible();

    await popupPage.close();
  });

  test('onboarding page is accessible', async () => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/onboarding.html`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Decide as you search')).toBeVisible();

    await page.close();
  });

  test('options page loads', async () => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Settings', { exact: true })).toBeVisible();

    await page.close();
  });

  test('side panel page loads', async () => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Start your first research board')).toBeVisible();

    await page.close();
  });

  test('project creation flow', async () => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(async () => {
      await chrome.runtime.sendMessage({ type: 'CREATE_PROJECT', name: 'E2E Test Project' });
    });
    await page.reload();
    await expect(page.getByText('E2E Test Project', { exact: true }).first()).toBeVisible();

    await page.close();
  });
});
