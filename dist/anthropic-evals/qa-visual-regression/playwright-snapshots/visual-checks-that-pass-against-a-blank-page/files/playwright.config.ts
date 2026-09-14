import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  retries: 1,

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 1,
      threshold: 0.2,
      animations: 'disabled',
      mask: [
        '#intercom-container',
        '.price-ticker',
        '[data-testid="promo-strip"]',
        '.session-clock',
        '#build-stamp',
      ],
    },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
