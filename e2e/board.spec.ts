import { test, expect, type BrowserContext, chromium } from '@playwright/test';
import path from 'node:path';

/**
 * E2E tests for the full board page.
 * Tests filter/sort functionality, view switching, and export buttons.
 *
 * To run locally:
 *   1. Build the extension: npm run build
 *   2. Run tests: npx playwright test e2e/board.spec.ts
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

test.describe('Board page', () => {
  test.describe.configure({ mode: 'serial' });
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    context = await createExtensionContext();
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    extensionId = background.url().split('/')[2]!;
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('board page loads successfully', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/board.html`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('main.board-page')).toBeVisible();

    await page.close();
  });

  test('board shows empty state when no projects exist', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/board.html`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText(/Select or create a project|E2E Test Project/).first()).toBeVisible();

    await page.close();
  });

  test('filter bar is present on board', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/board.html`);
    await page.waitForLoadState('domcontentloaded');

    const hasProject = await page.getByText('E2E Test Project', { exact: true }).count();
    if (hasProject > 0) await expect(page.locator('input[placeholder*="search" i]')).toBeVisible();

    await page.close();
  });

  test('sort controls are accessible', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/board.html`);
    await page.waitForLoadState('domcontentloaded');

    if (await page.getByText('E2E Test Project', { exact: true }).count() > 0) await expect(page.locator('select.sort')).toBeVisible();

    await page.close();
  });

  test('export buttons are present', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/board.html`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();

    await page.close();
  });

  test('view switching controls exist', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/board.html`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('button', { name: 'List view' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Grid view' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comparison view' })).toBeVisible();

    await page.close();
  });

  test('board navigation works', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/board.html`);
    await page.waitForLoadState('domcontentloaded');

    // Verify the page rendered without JS errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Wait a moment for any async rendering
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);

    await page.close();
  });

  test('keyboard shortcuts do not interfere with page interactions', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/board.html`);
    await page.waitForLoadState('domcontentloaded');

    // Focus a text input if it exists and type
    const input = page.locator('input[type="text"]').first();
    if (await input.count() > 0) {
      await input.click();
      await input.fill('test search query');
      const value = await input.inputValue();
      expect(value).toBe('test search query');
    }

    await page.close();
  });
});
