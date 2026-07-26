---
name: mobile-web-emulation-runner
description: "Builds a workflow to run web E2E tests under mobile viewports + DPRs (device pixel ratios): Playwright's `devices` catalog (iPhone 15, Pixel 7), suite run per-device as matrix shards, per-device screenshots, mobile assertions (`.tap()`, viewport-conditional layout). Use when a responsive web app needs mobile-breakpoint regression without a real-device farm. Mobile WEB only - for native apps use appium-testing, detox-testing, or flutter-testing; for cross-shard aggregation use mobile-device-matrix-toolkit; for gesture sequences use touch-gesture-tester."
---

# mobile-web-emulation-runner

## Overview

Many web apps support mobile via responsive design - but the
desktop test suite never exercises mobile breakpoints. Real-device
testing (`appium-testing`,
`xcuitest-suite`) is heavy; viewport
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

## How to use

1. Choose the device profiles to cover from Playwright's `devices` catalog
   (Step 1, [references/device-profiles-and-cypress.md](references/device-profiles-and-cypress.md)).
2. Declare one Playwright project per profile in `playwright.config.ts` (Step 2).
3. Write mobile-aware assertions with `.tap()` and viewport-conditional
   layout checks (Step 3).
4. Add per-device visual snapshots so mobile-size layout regressions are
   caught (Step 4).
5. Run each project as its own CI matrix job with `fail-fast: false` (Step 5).
6. Aggregate the per-device results into one pass/fail summary (Step 6).

## Step 1 - Pick the device profiles

Playwright ships a `devices` catalog with realistic viewport / DPR /
user-agent combinations - import it and spread a profile into a project's
`use` block:

```typescript
import { devices } from '@playwright/test';

// each entry carries viewport + DPR + user-agent + touch flags, e.g.
// devices['iPhone 15'] -> viewport 393x852, DPR 3, isMobile, hasTouch
```

`isMobile: true` triggers Playwright's mobile-mode quirks (meta viewport
handling); `hasTouch: true` enables touch-event synthesis. The full profile
catalog, the shape of each entry, and the Cypress runner equivalent are in
[references/device-profiles-and-cypress.md](references/device-profiles-and-cypress.md).

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

## Step 5 - CI matrix

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

Verify: assert every matrix shard exits 0. Because `fail-fast: false` lets
shards fail independently, gate the merge on all shards green - one red shard
(e.g. mobile-iphone-15) must block, never be averaged away.

## Step 6 - Aggregating per-device results

Use the `mobile-device-matrix-toolkit`
aggregator (Step 4) to produce a per-device summary:

```markdown
| Project                | Tests | Pass | Fail | Time   |
|------------------------|------:|-----:|-----:|-------:|
| desktop-chromium        |   42  |   42 |    0 | 120s   |
| mobile-iphone-15        |   42  |   40 |    2 | 145s   |   ← drawer regression
| mobile-pixel-7          |   42  |   42 |    0 | 138s   |
| tablet-ipad-pro         |   42  |   41 |    1 | 132s   |   ← landscape layout

Verify: before merging, assert every row shows Fail = 0. If a shard is red
(e.g. mobile-iphone-15 above), open its report, reproduce with
`npx playwright test --project=<shard>`, fix the mobile-breakpoint
regression, and re-run that shard until green.
```

## Worked example

A responsive storefront renders its nav as a sidebar on desktop and behind a
hamburger on mobile. A regression once hid the hamburger at iPhone width.

1. Add a `mobile-iphone-15` project to `playwright.config.ts` alongside
   `desktop-chromium` (Step 2), each spreading its `devices[...]` profile.
2. Author the `'shows mobile drawer, not sidebar'` assertion from Step 3 under
   `test.use(devices['iPhone 15'])`.
3. Run `npx playwright test --project=mobile-iphone-15`.
4. The hamburger assertion fails on the regressed build (the button is not
   visible) while the same suite passes on `desktop-chromium`. The matrix
   summary flags `mobile-iphone-15` red and desktop green, pinpointing a
   mobile-breakpoint-only regression the desktop suite never exercised.

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Running the same desktop tests with `viewport: { width: 375 }` only   | Misses DPR / touch / user-agent differences.                              | Use `devices[...]` catalog (Step 1). |
| `.click()` on mobile project                                           | Synthesizes mouse events; misses touch-handler bugs.                     | `.tap()` for `isMobile: true` projects (Step 3). |
| One desktop+mobile mega-test                                          | Branching `if (viewport.width < ...)` clutters; per-project tests cleaner. | Per-project tests (Step 2). |
| Mobile-only baselines without desktop comparison                       | Misses cases where the desktop layout regressed at the mobile breakpoint.| Both desktop + mobile in CI (Step 5). |
| Treating emulation as substitute for real devices                      | Emulation doesn't catch real-device perf, touch sensitivity, browser quirks. | Pair with farm runs for release tier. |
| Skipping `--with-deps` in Playwright install                           | CI runner missing browser dependencies; mobile profiles fail.            | Always `npx playwright install --with-deps` in CI (Step 5). |

## Limitations

- **Emulation ≠ real device.** Mobile Safari has quirks Chromium
  emulation doesn't reproduce (e.g. `100vh` viewport behavior,
  iOS-specific gestures). Pair with real-device testing for the
  release tier.
- **No native APIs.** Emulation can't test camera / push
  notifications / geolocation accuracy / biometrics.
- **Performance under emulation is the runner's CPU.** For mobile
  perf testing, see `mobile-web-perf-budget`
  + Lighthouse mobile profile.
- **Cypress feature gap.** Playwright's `devices` catalog is
  richer; Cypress requires more manual setup.

## References

- [references/device-profiles-and-cypress.md](references/device-profiles-and-cypress.md) -
  full Playwright `devices` catalog (viewport / DPR / UA / touch synthesis)
  and the Cypress runner equivalent.
- `mobile-device-matrix-toolkit` - sibling: orchestrates per-target dispatch and aggregation.
- `mobile-web-perf-budget` - 
  performance testing under mobile profile.
- `touch-gesture-tester` - 
  detailed touch-gesture verification.
- `playwright-snapshots` - per-device visual regression.
