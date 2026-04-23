import { defineConfig } from '@playwright/test';

const executablePath =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH || process.env.E2E_BROWSER_PATH || undefined;
const channel =
  process.env.PLAYWRIGHT_BROWSER_CHANNEL || process.env.E2E_BROWSER_CHANNEL || undefined;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4173',
    channel,
    launchOptions: executablePath
      ? {
          executablePath
        }
      : undefined,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  reporter: [['list']]
});
