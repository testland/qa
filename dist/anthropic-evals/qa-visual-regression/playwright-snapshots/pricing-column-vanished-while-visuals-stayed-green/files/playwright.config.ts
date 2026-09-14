import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [['html', { outputFolder: 'playwright-report' }], ['json', { outputFile: 'reports/run.json' }]],

  expect: {
    toHaveScreenshot: {
      threshold: 0.6,
      maxDiffPixels: 45000,
      animations: 'disabled',
    },
  },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
});
