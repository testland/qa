---
component: e2e-selector-quality-critic
type: agent
archetype: A3
---

# e2e-selector-quality-critic - evals

Companion eval cases for [`e2e-selector-quality-critic`](../../e2e-selector-quality-critic.md).
Three cases cover happy path / branch / adversarial: brittle CSS / XPath
selectors flagged for `getByRole` replacement, an accessibility-first
Playwright file with no high-priority findings, and a unit-test input
that triggers the refuse-to-proceed rule (out-of-scope: non-E2E file).
Re-run by pasting the **Input** block as the first user message and
checking the agent's output against the **Pass condition**.

## Eval 1 - happy path - brittle selectors + non-web-first assertion

**Input:**

```
Please review this Playwright E2E test file for selector quality. It's
the only file in the PR diff and lives at tests/e2e/checkout.spec.ts.

import { test, expect } from '@playwright/test';

test('user can submit checkout', async ({ page }) => {
  await page.goto('/checkout');

  // Click the submit button
  await page.locator('.button-primary.submit-button').click();

  // Click the 2nd item in the line-items list
  await page.locator('li:nth-child(2)').click();

  // Open the discount drawer via xpath
  await page.locator('xpath=//div[@class="cart"]//button[1]').click();

  // Confirm the toast is up
  expect(await page.locator('.toast').isVisible()).toBe(true);

  // Wait for the redirect
  await page.waitForTimeout(2000);
});
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 detects an E2E file via the `@playwright/test`
import. Step 2 classifies the selectors: `.button-primary.submit-button`
as `css-class`, `li:nth-child(2)` as `nth-position`, and
`xpath=//div[@class="cart"]//button[1]` as `xpath`. Step 3 flags the
non-web-first assertion `expect(await ... .isVisible()).toBe(true)` and
the bare `waitForTimeout(2000)`. Step 4 emits specific replacement
recommendations: `getByRole('button', { name: 'Submit' })`,
`getByRole('listitem').filter({ hasText: ... })`,
`await expect(page.locator('.toast')).toBeVisible()`. Output cites
`pw-best-practices` or `tl-queries` (Testing Library) priority order.

**Pass condition:** Output contains the literal string `getByRole` AND
at least one of `css-class` / `xpath` / `nth-position` (a classification
label). Output flags the non-web-first assertion (contains one of
`toBeVisible` / `web-first` / `auto-wait`).

## Eval 2 - branch - accessibility-first file (no high-priority findings)

**Input:**

```
Review selector quality of this Playwright E2E file. It's the only file
in the PR diff and lives at tests/e2e/login.spec.ts.

import { test, expect } from '@playwright/test';

test('registered user can sign in', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('test-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Welcome back' }))
    .toBeVisible();
  await expect(page.getByTestId('user-menu')).toBeVisible();
});
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 detects the E2E file. Step 2 classifies:
`getByLabel('Email')` and `getByLabel('Password')` as `semantic-ok`,
`getByRole('button', ...)` and `getByRole('heading', ...)` as
`accessibility`, `getByTestId('user-menu')` as `testid` (acceptable
last-resort). Step 3 finds zero non-web-first assertions - both `expect`
calls use the web-first `toBeVisible()` form. Step 4 emits no
recommended replacements. The findings table reports 0 for
`css-class` / `nth-position` / `xpath` / non-web-first asserts.

**Pass condition:** Output contains the literal string `accessibility`
AND does NOT recommend replacing any of `getByLabel('Email')` /
`getByRole('button'` / `getByTestId('user-menu')`. Output does NOT
contain `css-class` listed as a finding count >0 (the findings table
row for `css-class` reads 0 or the section explicitly notes no
high-priority findings).

## Eval 3 - adversarial - refuse on non-E2E (unit) test file

**Input:**

```
Review selector quality of this test file. It's the only file in the PR
diff and lives at tests/unit/computeTotal.spec.ts.

import { describe, it, expect } from 'vitest';
import { computeTotal } from '../../src/pricing';

describe('computeTotal', () => {
  it('sums a single line item', () => {
    const total = computeTotal([{ sku: 'BOOK-001', price: 12.50, qty: 1 }]);
    expect(total).toBe(12.50);
  });

  it('applies a 10% promo when promoCode is FALL10', () => {
    const total = computeTotal(
      [{ sku: 'BOOK-001', price: 100, qty: 1 }],
      { promoCode: 'FALL10' },
    );
    expect(total).toBe(90);
  });
});
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per Step 1's E2E-file heuristic (must import
`@playwright/test` / `cypress` / `webdriverio` / `selenium-webdriver` or
contain `browser.` / `page.` / `cy.` patterns), this file is a Vitest
unit test - there is no E2E framework import and no `page.` / `cy.`
usage. Per the Refuse-to-proceed rule "Operate on unit / integration
tests. Strictly E2E test files (Step 1)," the agent refuses to issue a
selector-quality verdict. Output names the unit / integration scope
restriction and the E2E filter, and does NOT classify any locator as
`accessibility` / `semantic-ok` / `testid` / `css-class` / `nth-position` /
`xpath`.

**Pass condition:** Output contains one of `unit` / `not an E2E` /
`E2E test files only` / `out of scope` (case-insensitive) AND does NOT
contain any selector classification label (`accessibility`,
`semantic-ok`, `testid`, `css-class`, `nth-position`, `xpath`) as a
findings-table row. The agent must not claim to have classified
selectors in a unit test - that is the entire adversarial point of
the eval.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a sample repo. Tool surface (`Read`,
  `Grep`, `Glob`) is read-only.
- Pass conditions are literal-substring checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
