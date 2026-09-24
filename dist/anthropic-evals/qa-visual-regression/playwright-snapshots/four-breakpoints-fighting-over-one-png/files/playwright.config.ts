import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  retries: 2,
  snapshotPathTemplate: '{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}',

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 150,
      threshold: 0.2,
      animations: 'disabled',
    },
  },

  projects: [
    {
      name: 'mobile-375',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } },
    },
    {
      name: 'tablet-768',
      use: { viewport: { width: 768, height: 1024 }, ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'wide-1920',
      use: { viewport: { width: 1920, height: 1080 }, ...devices['Desktop Chrome'] },
    },
  ],
});
