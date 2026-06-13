---
name: playwright-testing
description: "Authors and remediates Playwright E2E tests across Chromium, Firefox, WebKit - `npm init playwright@latest` scaffolding, `playwright.config.ts` browser projects, accessibility-first locators (`getByRole`/`getByLabelText`) to replace brittle CSS selectors, web-first assertions to eliminate `waitForTimeout` flakiness, Page Object pattern, trace viewer debugging, sharded parallel execution with merged HTML reporting, and GitHub Actions CI integration. Use for new test authoring, flakiness remediation, and CI setup; for reviewing codegen output specifically, see playwright-codegen-reviewer."
rating: 24
d6: 4
---

# playwright-testing

## Overview

Per [pw-intro][pwi]:

[pwi]: https://playwright.dev/docs/intro

> "**Playwright Test** is an end-to-end test framework for modern
> web apps. It bundles test runner, assertions, isolation,
> parallelization and rich tooling."

> "The framework supports Chromium, WebKit, and Firefox across
> Windows, Linux, and macOS." ([pw-intro][pwi])

## When to use

- New web E2E project; pick Playwright as the modern default.
- Cross-browser coverage matters (per
  [`browser-matrix-runner`](../../../qa-compatibility/skills/browser-matrix-runner/SKILL.md)) - Playwright's three-engine support is the differentiator.
- Migration from Selenium / WebDriver-based stacks (see
  [`selenium-testing`](../selenium-testing/SKILL.md)).

## Step 1 - Scaffold

Per [pw-intro][pwi]:

```bash
npm init playwright@latest
```

The init prompts choose TypeScript/JavaScript, tests folder,
GitHub Actions CI, and browser binaries.

What lands: `playwright.config.ts` + `tests/example.spec.ts` +
`package.json` updates.

## Step 2 - Author tests with accessibility-first locators

```typescript
import { test, expect } from '@playwright/test';

test('checkout flow happy path', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: /sign in/i }).click();
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('test-password');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

  await page.getByRole('link', { name: /shop/i }).click();
  await page.getByRole('link', { name: /BOOK-001/i }).click();
  await page.getByRole('button', { name: /add to cart/i }).click();
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});
```

Per [`e2e-selector-quality-critic`](../../../qa-test-review/agents/e2e-selector-quality-critic.md):
prefer `getByRole` / `getByLabelText` / `getByText` over CSS class
/ XPath. Web-first assertions (`await expect(...)`) auto-wait
within the test timeout.

## Step 3 - Page Object pattern

```typescript
// tests/page-objects/CheckoutPage.ts
import { Page, expect } from '@playwright/test';

export class CheckoutPage {
  constructor(private page: Page) {}

  async signIn(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: /sign in/i }).click();
  }

  async addToCart(sku: string) {
    await this.page.getByRole('link', { name: new RegExp(sku, 'i') }).click();
    await this.page.getByRole('button', { name: /add to cart/i }).click();
  }

  async expectConfirmation() {
    await expect(this.page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();
  }
}
```

Tests import the Page Object:

```typescript
test('checkout', async ({ page }) => {
  const checkout = new CheckoutPage(page);
  await checkout.signIn('user@example.com', 'pwd');
  await checkout.addToCart('BOOK-001');
  await checkout.expectConfirmation();
});
```

## Step 4 - Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
```

`trace: 'on-first-retry'` captures rich debug info (DOM snapshots,
network, console) only when needed - avoids storage cost on
passing runs.

## Step 5 - Run

Per [pw-intro][pwi]:

```bash
# All tests, all browsers, headless, parallel
npx playwright test

# Specific browser
npx playwright test --project=chromium

# Headed (see the browser)
npx playwright test --headed

# UI Mode (watch + debug)
npx playwright test --ui

# Single test file
npx playwright test tests/checkout.spec.ts

# Single test by name
npx playwright test -g "checkout flow"
```

## Step 6 - Trace viewer

When a test fails, the trace contains everything needed to
debug:

```bash
# After a failure
npx playwright show-trace test-results/<...>/trace.zip
```

The viewer shows:
- DOM snapshot at each action.
- Network requests + responses.
- Console output.
- Screenshots.
- Source code with highlighted line.

## Step 7 - Sharded execution

For large suites:

```bash
# Run 4 of 4 shards (one per CI job)
npx playwright test --shard=1/4
npx playwright test --shard=2/4
# ... etc.
```

```yaml
# CI matrix
strategy:
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]
runs-on: ubuntu-latest
steps:
  - run: npx playwright test --shard=${{ matrix.shard }}
```

## Step 8 - CI integration

```yaml
# .github/workflows/playwright.yml
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Step 9 - Reporting

Per [pw-intro][pwi]: "The HTML Reporter provides a filterable
dashboard showing results by browser, status (passed/failed/skipped),
and flaky tests."

```bash
npx playwright show-report
```

For programmatic / CI consumption, the JUnit reporter (Step 4)
feeds [`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| CSS-class / XPath selectors                                           | Brittle to DOM changes.                                                   | `getByRole` / `getByLabelText` per [`e2e-selector-quality-critic`](../../../qa-test-review/agents/e2e-selector-quality-critic.md). |
| `page.waitForTimeout(2000)`                                            | Flaky on slow CI; slow on fast.                                           | Web-first assertions (auto-wait). |
| One mega-test that spans multiple flows                                | Failure mid-test obscures cause.                                          | Per-flow tests; share setup via Page Objects. |
| Skipping `--with-deps` in CI                                           | Linux runner missing browser deps.                                       | Always `--with-deps` (Step 8). |
| `trace: 'on'` always                                                   | Wasted storage on passing runs.                                           | `trace: 'on-first-retry'` (Step 4). |

## Limitations

- **No real Safari.** WebKit ≠ Safari (per [`browser-matrix-runner`](../../../qa-compatibility/skills/browser-matrix-runner/SKILL.md));
  iOS Safari needs real-device testing.
- **Per-test runtime ~2-30s.** E2E expensive vs unit tests; use
  pyramid balance per [`test-pyramid-balancer`](../../../qa-process/skills/test-pyramid-balancer/SKILL.md).
- **Browser version drift.** Playwright N+1 ahead of stable; some
  tests pass in Playwright but fail in shipped Chrome.

## References

- [pwi][pwi] - Playwright overview, install via `npm init
  playwright@latest`, three-engine support, CLI flags, HTML
  Reporter.
- [`e2e-selector-quality-critic`](../../../qa-test-review/agents/e2e-selector-quality-critic.md) - selector convention.
- [`playwright-codegen-reviewer`](../../agents/playwright-codegen-reviewer.md) - sibling agent for codegen output review.
- [`browser-matrix-runner`](../../../qa-compatibility/skills/browser-matrix-runner/SKILL.md) - cross-browser matrix.
- [`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md) - downstream JUnit XML parsing.
