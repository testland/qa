import { defineConfig, devices } from '@playwright/test';

const screenshotDefaults = {
  maxDiffPixels: 120,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  mask: ['#intercom-container', '.session-timer'],
};

export default defineConfig({
  testDir: './tests',
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  expect: {
    toHaveScreenshot: { ...screenshotDefaults },
  },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:8080',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
