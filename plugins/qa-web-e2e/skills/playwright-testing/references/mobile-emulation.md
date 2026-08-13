# Mobile-web emulation - devices catalog, per-device projects, CI matrix

Deep reference for `playwright-testing`. Consult when a responsive web app
needs mobile-breakpoint regression without a real-device farm: viewport +
DPR + user-agent + touch emulation via Playwright's `devices` catalog.

Emulation covers mobile **web** only - for native apps use the qa-mobile
plugin (appium-testing, detox-testing, flutter-testing).

## Device profiles

Playwright ships a `devices` catalog with realistic viewport / DPR /
user-agent combinations:

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

`isMobile: true` triggers Playwright's mobile-mode quirks (meta viewport
handling); `hasTouch: true` enables touch-event synthesis.

## Per-device project config

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

Run all projects: `npx playwright test`. Run only mobile:

```bash
npx playwright test --project=mobile-iphone-15 --project=mobile-pixel-7
```

## Mobile-specific assertions

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

`.tap()` synthesizes a touch event (enabled by `hasTouch: true`);
`.click()` synthesizes mouse events. Prefer `.tap()` on mobile profiles -
`.click()` misses touch-handler bugs.

## Visual regression per device

```typescript
test('home page mobile layout snapshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home-iphone-15.png');
});
```

Per-device screenshots produce per-device baselines; layout regressions at
iPhone width catch issues desktop-only tests miss. Pair with
`playwright-snapshots` (in the qa-visual-regression plugin).

## CI matrix

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

Each project runs as a separate matrix job; `fail-fast: false` ensures a
failure on iPhone doesn't cancel Pixel. Because shards fail independently,
gate the merge on **all** shards green - one red shard must block, never be
averaged away.

## Cypress equivalent

Cypress doesn't ship a `devices` catalog as rich as Playwright's; viewport
sizing is the primary control:

```javascript
beforeEach(() => {
  cy.viewport('iphone-15');   // built-in preset
  // OR
  cy.viewport(393, 852, 'portrait');
});
```

For touch-event synthesis, use `cy.realTouch()` (via the
`cypress-real-events` plugin).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Setting `viewport: { width: 375 }` only | Misses DPR / touch / user-agent differences | Spread a `devices[...]` profile |
| `.click()` on mobile projects | Synthesizes mouse events; misses touch-handler bugs | `.tap()` when `hasTouch: true` |
| One desktop+mobile mega-test | `if (viewport.width < ...)` branching clutters | Per-project tests |
| Mobile-only baselines without desktop comparison | Misses desktop regressions at the mobile breakpoint | Both desktop + mobile projects in CI |
| Treating emulation as a real-device substitute | Misses real-device perf, touch sensitivity, browser quirks | Pair with farm runs for the release tier |

## Limitations

- **Emulation ≠ real device.** Mobile Safari has quirks Chromium emulation
  doesn't reproduce (`100vh` viewport behavior, iOS-specific gestures).
- **No native APIs.** Camera / push / geolocation accuracy / biometrics
  are out of reach.
- **Performance is the runner's CPU.** Use Lighthouse's mobile profile for
  mobile perf budgets.
