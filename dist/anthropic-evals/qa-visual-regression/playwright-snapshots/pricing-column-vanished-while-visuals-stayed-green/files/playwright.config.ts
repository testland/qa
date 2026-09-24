import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  retries: 2,

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 400000,
      threshold: 0.55,
      animations: 'allow',
    },
  },

  projects: [
    { name: 'app',       use: { ...devices['Desktop Chrome'] } },
    { name: 'marketing', use: { ...devices['Desktop Chrome'] } },
  ],
});
