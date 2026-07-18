---
name: mobile-web-emulation-runner
description: "Builds a workflow to run web E2E tests under mobile viewports + DPRs (device pixel ratios): uses Playwright's `devices` catalog (iPhone 15, Pixel 7, etc.), runs the existing test suite per-device as separate matrix shards, captures per-device screenshots for visual review, and asserts mobile-specific behaviors (touch interactions, viewport-conditional layout). Use when the web app supports mobile and the team wants regression coverage without spinning up real Android/iOS test rigs. For post-run result aggregation across device shards, use mobile-device-matrix-toolkit; for isolated gesture-sequence verification, use touch-gesture-tester."
---

# mobile-web-emulation-runner

## Overview

Many web apps support mobile via responsive design - but the
desktop test suite never exercises mobile breakpoints. Real-device
testing ([`appium-testing`](../appium-testing/SKILL.md),
[`xcuitest-suite`](../xcuitest-suite/SKILL.md)) is heavy; viewport
emulation in browser-based testing is light.

Playwright + Cypress + Selenium all support mobile emulation:
viewport size, device pixel ratio, user agent, and touch event
synthesis can be configured per test.

This skill builds the workflow.

## When to use

- The web app has a mobile responsive layout and the team wants
  regression coverage on mobile breakpoints.
- A bug surfaced on mobile-only and needs a regression test that
  doesn't require a real device.
- Pre-release sweep wants a "does the site look right at iPhone
  size" gate without setting up a mobile test farm.

If the app is a **native** mobile app (RN, Flutter, native iOS/Android),
this isn't the right skill - see the per-platform alternatives.

## Step 1 - Pick the device profiles

Playwright ships a `devices` catalog with realistic viewport / DPR
/ user-agent combinations:

```typescript
import { devices } from '@playwright/test';

// Common modern profiles:
devices['iPhone 15']
devices['iPhone 15 Pro Max']
devices['iPhone 14']
devices['Pixel 7']
devices['Pixel 5']
devices['Galaxy S9+']
devices['iPad Pro 11']
devices['iPad Mini']
```

Each entry includes:

```javascript
{
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; ...) AppleWebKit/...',
}
```

`isMobile: true` triggers Playwright's mobile-mode quirks (meta
viewport handling); `hasTouch: true` enables touch-event synthesis.

## Step 2 - Per-device project config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-iphone-15',
      use: { ...devices['iPhone 15'] },
    },
    {
      name: 'mobile-pixel-7',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'tablet-ipad-pro',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
});
```

Run all projects (which is the desktop + 3 mobile shards):

```bash
npx playwright test
```

Run only mobile:

```bash
npx playwright test --project=mobile-iphone-15 --project=mobile-pixel-7
```

## Step 3 - Mobile-specific assertions

Tests should distinguish desktop-only from mobile-aware behavior:

```typescript
import { test, expect, devices } from '@playwright/test';

test.describe('Cart page - mobile layout', () => {
  test.use(devices['iPhone 15']);

  test('shows mobile drawer, not sidebar', async ({ page }) => {
    await page.goto('/cart');
    // Mobile-specific: drawer behind hamburger
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
    await expect(page.getByRole('navigation')).not.toBeVisible();   // hidden until open
  });

  test('tap (not click) on add-to-cart', async ({ page }) => {
    await page.goto('/products/BOOK-001');
    await page.getByRole('button', { name: /add to cart/i }).tap();   // .tap not .click
    await expect(page.getByRole('alert', { name: /added/i })).toBeVisible();
  });
});
```

`.tap()` synthesizes a touch event (`isMobile: true` enables);
`.click()` synthesizes mouse events. Prefer `.tap()` on mobile
profiles.

## Step 4 - Visual regression per device

```typescript
test('home page mobile layout snapshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home-iphone-15.png');
});
```

Per-device screenshots produce per-device baselines; layout
regressions on iPhone size catch issues that desktop-only tests
miss. Pair with `playwright-snapshots` (in the qa-visual-regression plugin).

## Step 5 - Cypress equivalent

```javascript
// cypress.config.ts
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Per-test or per-spec viewport
    },
    viewportWidth: 1280,
    viewportHeight: 720,
  },
});

// In a test:
beforeEach(() => {
  cy.viewport('iphone-15');   // built-in preset
  // OR
  cy.viewport(393, 852, 'portrait');
});
```

Cypress doesn't ship a `devices` catalog as rich as Playwright's;
viewport sizing is the primary control. For touch-event synthesis,
use `cy.realTouch()` (via `cypress-real-events` plugin).

## Step 6 - CI matrix

```yaml
jobs:
  e2e:
    strategy:
      fail-fast: false
      matrix:
        project:
          - desktop-chromium
          - mobile-iphone-15
          - mobile-pixel-7
          - tablet-ipad-pro
    runs-on: ubuntu-latest
    name: ${{ matrix.project }}
    steps:
      - uses: actions/checkout@v5
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --project=${{ matrix.project }}
```

Each project runs as a separate matrix job; `fail-fast: false`
ensures a failure on iPhone doesn't cancel Pixel.

## Step 7 - Aggregating per-device results

Use the [`mobile-device-matrix-toolkit`](../mobile-device-matrix-toolkit/SKILL.md)
aggregator (Step 4) to produce a per-device summary:

```markdown
| Project                | Tests | Pass | Fail | Time   |
|------------------------|------:|-----:|-----:|-------:|
| desktop-chromium        |   42  |   42 |    0 | 120s   |
| mobile-iphone-15        |   42  |   40 |    2 | 145s   |   ← drawer regression
| mobile-pixel-7          |   42  |   42 |    0 | 138s   |
| tablet-ipad-pro         |   42  |   41 |    1 | 132s   |   ← landscape layout
```

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Running the same desktop tests with `viewport: { width: 375 }` only   | Misses DPR / touch / user-agent differences.                              | Use `devices[...]` catalog (Step 1). |
| `.click()` on mobile project                                           | Synthesizes mouse events; misses touch-handler bugs.                     | `.tap()` for `isMobile: true` projects (Step 3). |
| One desktop+mobile mega-test                                          | Branching `if (viewport.width < ...)` clutters; per-project tests cleaner. | Per-project tests (Step 2). |
| Mobile-only baselines without desktop comparison                       | Misses cases where the desktop layout regressed at the mobile breakpoint.| Both desktop + mobile in CI (Step 6). |
| Treating emulation as substitute for real devices                      | Emulation doesn't catch real-device perf, touch sensitivity, browser quirks. | Pair with farm runs for release tier. |
| Skipping `--with-deps` in Playwright install                           | CI runner missing browser dependencies; mobile profiles fail.            | Always `npx playwright install --with-deps` in CI (Step 6). |

## Limitations

- **Emulation ≠ real device.** Mobile Safari has quirks Chromium
  emulation doesn't reproduce (e.g. `100vh` viewport behavior,
  iOS-specific gestures). Pair with real-device testing for the
  release tier.
- **No native APIs.** Emulation can't test camera / push
  notifications / geolocation accuracy / biometrics.
- **Performance under emulation is the runner's CPU.** For mobile
  perf testing, see [`mobile-perf-budget`](../mobile-perf-budget/SKILL.md)
  + Lighthouse mobile profile.
- **Cypress feature gap.** Playwright's `devices` catalog is
  richer; Cypress requires more manual setup.

## References

- Playwright devices catalog (in the `@playwright/test` package);
  per-device viewport / DPR / UA / touch synthesis.
- [`mobile-device-matrix-toolkit`](../mobile-device-matrix-toolkit/SKILL.md) - sibling: orchestrates per-target dispatch and aggregation.
- [`mobile-perf-budget`](../mobile-perf-budget/SKILL.md) - 
  performance testing under mobile profile.
- [`touch-gesture-tester`](../touch-gesture-tester/SKILL.md) - 
  detailed touch-gesture verification.
- `playwright-snapshots` - per-device visual regression.
