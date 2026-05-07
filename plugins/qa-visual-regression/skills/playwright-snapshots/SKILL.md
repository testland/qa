---
name: playwright-snapshots
description: "Authors Playwright `expect(page).toHaveScreenshot()` assertions, configures masks / clips / threshold / maxDiffPixels per test, manages the per-OS / per-browser snapshot directory, and runs the update flow with `--update-snapshots`. Use when the project ships self-hosted visual regression coverage in Playwright (no external snapshot service)."
rating: 26
d6: 4
archetype: S1
---

# playwright-snapshots

## Overview

Playwright ships first-party visual regression assertions through
`expect(page).toHaveScreenshot()` (and the per-locator
`expect(locator).toHaveScreenshot()`). Snapshots are stored in the repo
under per-test, per-browser, per-OS PNG files; comparison happens
locally and the test fails when the diff exceeds the configured
threshold ([playwright-snapshots][snap]).

[snap]: https://playwright.dev/docs/test-snapshots
[assertion]: https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1

This is the **self-hosted** option — no external service, no per-snapshot
billing, but also no hosted UI for review (diffs are reviewed locally
or via CI artifact uploads).

## When to use

- The project already uses `@playwright/test`.
- The team prefers visual baselines committed to the repo (and reviewed
  in PR diffs) over a hosted UI.
- Coverage is page-driven (full pages, full viewports) rather than
  story-driven (in which case
  [`chromatic-visual-regression-testing`](../chromatic-visual-regression-testing/SKILL.md)
  may be a better fit).
- Snapshot determinism is high enough that pixel diffs are signal, not
  noise. If the page has chronic instability (animated SVGs, ads, A/B
  experiments), invest in masking before adopting.

## Authoring

### Page-level assertion

```typescript
import { test, expect } from '@playwright/test';

test('homepage visual', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot();
});
```

The first run generates the baseline PNG; subsequent runs compare against
it ([playwright-snapshots][snap]).

### Locator-level assertion

```typescript
test('header visual', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header')).toHaveScreenshot('header.png');
});
```

A locator-level snapshot is preferred when the surrounding page has
unrelated dynamic content (e.g. a ticker, a chat widget) — it scopes
the comparison and avoids false positives.

### `toHaveScreenshot()` options

Per the [PageAssertions API][assertion]:

| Option              | Effect                                                                              |
|---------------------|-------------------------------------------------------------------------------------|
| `animations`        | `"disabled"` (default) fast-forwards finite animations and cancels infinite ones; `"allow"` keeps them. |
| `caret`             | `"hide"` (default) removes the text cursor; `"initial"` preserves caret blinking.   |
| `clip`              | Rectangular area `{x, y, width, height}` to capture.                                |
| `fullPage`          | Capture the full scrollable page rather than just the viewport.                     |
| `mask`              | Array of locators whose elements are overlaid with a solid color (content hidden). |
| `maskColor`         | CSS color for the mask overlay; defaults to pink (`#FF00FF`).                       |
| `maxDiffPixels`     | Maximum absolute number of differing pixels allowed.                                |
| `maxDiffPixelRatio` | Maximum proportion (0–1) of differing pixels relative to total.                     |
| `omitBackground`    | Hide the white background for transparent capture (PNG only).                       |
| `scale`             | `"css"` (default; one image px per CSS px) or `"device"` for HiDPI capture.        |
| `stylePath`         | Path to a CSS file applied during capture to hide dynamic elements.                 |
| `threshold`         | Acceptable per-pixel color difference in YIQ space (0–1); default `0.2`.            |
| `timeout`           | Milliseconds to retry the assertion before failing.                                 |

Common patterns:

```typescript
// Mask a chat widget that animates
await expect(page).toHaveScreenshot({
  mask: [page.locator('#intercom-container')],
});

// Allow up to 50 differing pixels (anti-aliasing tolerance)
await expect(page).toHaveScreenshot({ maxDiffPixels: 50 });

// Clip to a known-stable region of an otherwise-noisy page
await expect(page).toHaveScreenshot({
  clip: { x: 0, y: 0, width: 1280, height: 400 },
});
```

## Snapshot directory layout

Playwright stores baselines in a sibling directory of the test file
([playwright-snapshots][snap]):

```
tests/
  homepage.spec.ts
  homepage.spec.ts-snapshots/
    homepage-visual-1-chromium-darwin.png
    homepage-visual-1-chromium-linux.png
    homepage-visual-1-firefox-darwin.png
    ...
```

Naming: `[test-name]-[index]-[browser]-[platform].png` ([playwright-snapshots][snap]).

This means **baselines are platform-specific**. Anti-aliasing, font
rendering, and emoji bitmaps differ between macOS, Linux, and Windows;
treat the platform suffix as load-bearing. The CI runner must match
the platform whose baselines are committed (typically `linux`).

## Project-wide configuration

Set defaults in `playwright.config.ts` so individual tests stay clean
([playwright-snapshots][snap]):

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: 'disabled',
    },
  },

  snapshotDir: 'tests/__snapshots__',   // optional override
  // snapshotPathTemplate: '{testFilePath}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}',

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
```

`projects` controls which browsers run; each project's snapshots live
in the same directory differentiated by the platform suffix.

## Running

### First run / update flow

```bash
# Run all tests including visual assertions
npx playwright test

# Update baselines (after intentional UI changes)
npx playwright test --update-snapshots

# Update baselines for a single test file
npx playwright test tests/homepage.spec.ts --update-snapshots
```

(Per [playwright-snapshots][snap].)

The `--update-snapshots` flag rewrites every PNG that the matched tests
would produce. Always **review the diff** of the baselines in your PR —
an over-broad update can hide a real regression.

### CI matching

Baselines committed from a developer laptop (macOS/darwin) will fail
on CI (linux) with platform-suffix mismatches. Two options:

1. **Run baseline updates in CI only.** Have a manual or
   `workflow_dispatch` workflow that runs `--update-snapshots` and
   commits the result back; developers never commit baselines from
   their laptop.
2. **Use Docker locally** with the official Playwright image
   (`mcr.microsoft.com/playwright:v<version>-jammy`) so local snapshots
   are bit-identical to CI.

Option 1 is the lower-friction default for most teams.

## CI integration

```yaml
# .github/workflows/playwright-visual.yml
name: visual

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run tests
        run: npx playwright test

      - name: Upload Playwright report (for diff triage)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

`if: always()` is critical — when a snapshot diff fails the test, the
HTML report is the only place to view the actual / expected / diff
images.

## References

- [playwright-snapshots][snap] — visual comparison tutorial, snapshot
  layout, update flow.
- [PageAssertions API][assertion] — full `toHaveScreenshot` option
  reference.
