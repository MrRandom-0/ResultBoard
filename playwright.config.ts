import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  workers: 1,
  fullyParallel: false,
  use: { trace: 'on-first-retry' },
  reporter: 'list',
  outputDir: 'output/playwright/test-results'
});
