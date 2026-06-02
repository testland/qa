---
name: browser-matrix-runner
description: "Configures a CI matrix that runs the smoke / regression suite across multiple browsers per Playwright's three-engine support (Chromium, Firefox, WebKit) plus branded variants (chrome, msedge channels). Wires GitHub Actions / GitLab CI matrix syntax, captures per-browser screenshots, and aggregates per-browser pass/fail. Use when the product targets multiple browsers and the team wants automated cross-browser regression."
rating: 23
d6: 4
archetype: S1
---

# browser-matrix-runner

## Overview

Per [pw-browsers][pwb]:

[pwb]: https://playwright.dev/docs/browsers

Playwright supports **three browser engines**:

> 1. **Chromium** - "Open source builds used by default. Playwright
>    versions support Chromium N+1 before branded browsers release
>    it."
> 2. **Firefox** - "Playwright's Firefox version matches the recent
>    Firefox Stable build."
> 3. **WebKit** - "Derived from latest WebKit main branch sources,
>    often before Safari incorporation."

Plus branded variants ([pw-browsers][pwb]):

> "Playwright can operate against Google Chrome and Microsoft Edge
> when installed on the machine. Available channels include:
> `chrome`, `chrome-beta`, `chrome-dev`, `chrome-canary`,
> `msedge`, `msedge-beta`, `msedge-dev`, `msedge-canary`."

## When to use

- The product runs on multiple browsers and the team wants
  automated cross-browser coverage.
- A bug report says "works in Chrome, broken in Safari."
- Pre-release: scheduled cross-browser smoke.

## Step 1 - Install browsers

Per [pw-browsers][pwb]:

```bash
# All Playwright-bundled browsers
npx playwright install

# Specific browsers
npx playwright install chromium firefox webkit

# With system dependencies (CI-friendly)
npx playwright install --with-deps
```

Branded:

```bash
npx playwright install msedge   # only on Windows / macOS
npx playwright install chrome
```

## Step 2 - Configure projects

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'edge',     use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'chrome',   use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
});
```

## Step 3 - Run

```bash
# All browsers
npx playwright test

# Specific browser
npx playwright test --project=firefox

# Multiple
npx playwright test --project=chromium --project=webkit
```

## Step 4 - CI matrix

```yaml
# .github/workflows/cross-browser.yml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
        include:
          - browser: edge
            os: windows-latest    # msedge on Windows
          - browser: chrome
            os: ubuntu-latest
    runs-on: ${{ matrix.os || 'ubuntu-latest' }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps ${{ matrix.browser }}
      - run: npx playwright test --project=${{ matrix.browser }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-${{ matrix.browser }}
          path: playwright-report/
```

`fail-fast: false` ensures Chromium failure doesn't cancel
WebKit / Firefox.

## Step 5 - Per-browser failure analysis

When per-browser failures appear:

```markdown
## Cross-browser results — `<sha>`

| Browser   | Tests | Pass | Fail | Time   |
|-----------|------:|-----:|-----:|-------:|
| Chromium  |   42  |   42 |    0 |  120s  |
| Firefox   |   42  |   42 |    0 |  135s  |
| WebKit    |   42  |   38 |    4 |  140s  |   ← WebKit-specific issues
| Edge      |   42  |   42 |    0 |  125s  |
| Chrome    |   42  |   42 |    0 |  120s  |

### WebKit-only failures

| Test                                | Symptom                                   |
|-------------------------------------|-------------------------------------------|
| `checkout.spec.ts > apply promo`     | `100vh` calculated wrong on iOS Safari   |
| `cart.spec.ts > add item`            | `IntersectionObserver` callback timing diff |
| ...                                  |                                           |
```

WebKit-only failures often cluster around well-known iOS Safari
quirks (viewport units, scroll behavior, font rendering).

## Step 6 - Engine vs channel choice

| Use the engine (Playwright-bundled) when                 | Use the branded channel when                       |
|----------------------------------------------------------|----------------------------------------------------|
| Default; reproducible across team / CI                  | Need to test specific Chrome / Edge release behavior |
| Faster CI (lighter download per [pw-browsers][pwb])      | Compliance / contract requires the branded build    |
| Pre-release behavior (Chromium N+1)                      | Bug reports against branded versions                |

For most teams: bundled engines for CI; branded channels for
manual / spot-check.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Single-browser CI                                                     | Cross-browser regressions invisible.                                     | Matrix (Step 4). |
| `fail-fast: true` on the matrix                                        | Chromium fails; team can't see WebKit / Firefox.                        | `fail-fast: false` (Step 4). |
| Skipping `--with-deps` install                                         | Linux runner missing browser dependencies; tests fail.                   | Always `--with-deps` in CI (Step 1). |
| Per-browser conditional code in tests                                  | Couples tests to browser implementation; fragile.                       | Test what users observe; abstract per-browser quirks in production code. |
| Not testing branded channels at all                                    | Misses Edge / Chrome-specific bugs.                                       | Schedule weekly branded-channel runs (Step 6). |

## Limitations

- **WebKit on CI is approximate.** Bundled WebKit ≠ Safari;
  per-browser quirks (especially iOS) need real-device testing
  via [`mobile-device-matrix-toolkit`](../../qa-mobile-native/skills/mobile-device-matrix-toolkit/SKILL.md).
- **Edge / Chrome require host OS.** msedge needs Windows or macOS;
  not Linux.
- **Per-browser CI cost adds up.** 5 browsers × N tests = 5x CI
  time / cost. Use selectively for full regression; run smoke
  cross-browser per-PR.

## References

- [pwb][pwb] - Playwright supported browsers (Chromium / Firefox /
  WebKit + branded channels), install commands, disk-space
  estimates.
- [`os-matrix-runner`](../os-matrix-runner/SKILL.md) - sibling for
  OS / runtime matrices.
- [`compatibility-budget`](../compatibility-budget/SKILL.md) - 
  conventions for choosing the matrix.
- [`mobile-web-emulation-runner`](../../qa-mobile-native/skills/mobile-web-emulation-runner/SKILL.md) - sibling: mobile viewport variants of the same browsers.
