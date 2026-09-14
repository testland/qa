import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: 3,
  reporter: [['html', { outputFolder: 'playwright-report' }]],

  snapshotPathTemplate: 'tests/__screens__/{arg}{ext}',

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 400,
      animations: 'disabled',
    },
  },

  use: {
    baseURL: 'http://localhost:4173',
  },

  projects: [
    { name: 'mobile-375',   use: { ...devices['Desktop Chrome'], viewport: { width: 375,  height: 667  } } },
    { name: 'tablet-768',   use: { ...devices['Desktop Chrome'], viewport: { width: 768,  height: 1024 } } },
    { name: 'desktop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800  } } },
    { name: 'wide-1920',    use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
});
