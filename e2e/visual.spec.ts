import { expect, test, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const EXTENSION_PATH = path.resolve(import.meta.dirname, '..', '.output', 'chrome-mv3');

test('seeded board and settings render without page errors', async () => {
  const context: BrowserContext = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--disable-default-apps',
    ],
  });

  try {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');
    const extensionId = background.url().split('/')[2]!;
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`chrome-extension://${extensionId}/board.html`);

    await page.evaluate(async () => {
      const send = async (message: unknown) => chrome.runtime.sendMessage(message);
      const created = await send({ type: 'CREATE_PROJECT', name: 'AI Research Landscape' });
      const projectId = created.data.activeProjectId as string;
      await send({ type: 'CREATE_TAG', projectId, name: 'Primary source', color: '#6366f1' });
      await send({ type: 'CREATE_TAG', projectId, name: 'Needs review', color: '#f59e0b' });
      await send({ type: 'CREATE_CRITERION', projectId, name: 'Credibility', weight: 60 });
      await send({ type: 'CREATE_CRITERION', projectId, name: 'Practical value', weight: 40 });

      const results = [
        { url: 'https://example.com/frontier-models', canonicalUrl: 'https://example.com/frontier-models', title: 'Frontier model evaluation guide', snippet: 'A rigorous framework for comparing model quality, latency, cost, and reliability.', domain: 'example.com', sourceQuery: 'frontier model evaluation' },
        { url: 'https://research.example.org/agents', canonicalUrl: 'https://research.example.org/agents', title: 'Reliable agents in production', snippet: 'Field notes on tool use, evaluation design, observability, and failure recovery.', domain: 'research.example.org', sourceQuery: 'production ai agents' },
        { url: 'https://labs.example.net/report', canonicalUrl: 'https://labs.example.net/report', title: '2026 AI systems report', snippet: 'A broad market report with useful data that still needs source verification.', domain: 'labs.example.net', sourceQuery: 'ai systems report 2026' },
      ];
      await send({ type: 'CLASSIFY_RESULT', result: results[0], status: 'keep' });
      await send({ type: 'CLASSIFY_RESULT', result: results[1], status: 'keep' });
      await send({ type: 'CLASSIFY_RESULT', result: results[2], status: 'maybe' });

      const current = await send({ type: 'GET_STATE' });
      const state = current.data;
      const criteria = state.comparisonCriteria;
      const tags = state.tags;
      for (const [index, record] of state.records.entries()) {
        await send({
          type: 'UPDATE_RECORD',
          recordId: record.id,
          patch: {
            notes: index === 0 ? 'Strong methodology. Use this as the evaluation baseline.' : index === 1 ? 'Good operational examples and clear limitations.' : 'Verify the cited market numbers before relying on them.',
            tagIds: [tags[index === 2 ? 1 : 0].id],
            criterionScores: {
              [criteria[0].id]: [5, 4, 2][index],
              [criteria[1].id]: [4, 5, 3][index],
            },
          },
        });
      }
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: 'AI Research Landscape' })).toBeVisible();
    await page.screenshot({ path: 'output/playwright/qa/board.png', fullPage: true });

    const selectButtons = page.getByRole('button', { name: 'Select for comparison' });
    await selectButtons.nth(0).click();
    await selectButtons.nth(1).click();
    await page.getByRole('button', { name: 'Comparison view' }).click();
    await expect(page.getByText('Comparison Mode')).toBeVisible();
    await page.screenshot({ path: 'output/playwright/qa/comparison.png', fullPage: true });

    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await expect(page.getByText('Comparison criteria')).toBeVisible();
    await page.screenshot({ path: 'output/playwright/qa/options.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
