# Mobile layout regressions reach production

## Problem Description

Two thirds of our traffic is phones, but the E2E suite only ever runs at a
desktop window size. Twice this quarter a layout change shipped that collapsed
the navigation on narrow screens, and nobody caught it because every test ran
wide enough for the desktop layout.

The navigation is a hamburger menu under 768px and an inline bar above it. The
product grid is one column on a phone and three on a desktop.

We do not have a device lab and are not buying one this quarter. We want
coverage in the existing suite.

## Output Specification

1. Extend `playwright.config.ts` so the suite also runs against a small phone
   and a large phone in addition to the existing desktop run. The emulated
   characteristics must match the real devices - screen size, pixel density,
   user agent and touch capability - rather than being numbers we picked.
2. Add `tests/navigation.spec.ts` asserting that the hamburger menu is the
   navigation on a phone and the inline bar is the navigation on desktop, and
   that the product grid column count differs accordingly. The test must
   interact the way a phone user does, not the way a mouse user does.
3. Any screenshot the suite takes must not collide between the device
   configurations.

Leave `tests/smoke.spec.ts` alone.

## Input Files

Extract the following files before beginning.

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

=============== FILE: tests/smoke.spec.ts ===============
import { test, expect } from '@playwright/test';

test('home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
});
