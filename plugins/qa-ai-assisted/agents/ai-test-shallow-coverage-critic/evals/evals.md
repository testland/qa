---
component: ai-test-shallow-coverage-critic
type: agent
archetype: A3
---

# ai-test-shallow-coverage-critic — evals

Companion eval cases for [`ai-test-shallow-coverage-critic`](../../ai-test-shallow-coverage-critic.md).
Three cases cover happy path / branch / adversarial: a happy-path-only
unit suite that scores `SHALLOW` on §EP / §BVA / §NEG, a balanced suite
that scores `PASS` on the same axes, and a Playwright E2E suite that
triggers the documented refuse-to-operate-on-E2E rule. Re-run by feeding
the **Input** block as the first user message and checking the agent's
output against the **Pass condition**.

## Eval 1 — happy path — single equivalence class only (SHALLOW)

**Input:**

```
Review this PR for shallow input-domain coverage.

Diff (one new unit-test file):

File: src/cart/__tests__/addItem.spec.ts

import { addItem } from '../addItem';

describe('addItem', () => {
  it('adds 1 of product abc123def456abc123def456 to the cart', () => {
    const result = addItem('abc123def456abc123def456', 1);
    expect(result.items).toEqual([{ productId: 'abc123def456abc123def456', qty: 1 }]);
  });

  it('adds 2 of product 012345678901234567890123 to the cart', () => {
    const result = addItem('012345678901234567890123', 2);
    expect(result.items).toEqual([{ productId: '012345678901234567890123', qty: 2 }]);
  });

  it('adds 3 of product fedcba654321fedcba654321 to the cart', () => {
    const result = addItem('fedcba654321fedcba654321', 3);
    expect(result.items).toEqual([{ productId: 'fedcba654321fedcba654321', qty: 3 }]);
  });
});

SUT signature (from src/cart/addItem.ts):

  /**
   * @param productId 24-char hex string
   * @param qty integer; schema: { min: 1, max: 99 }
   * @throws InvalidQtyError when qty is outside [1, 99]
   * @throws ProductNotFoundError when productId is unknown
   */
  export function addItem(productId: string, qty: number): Cart

The repository does NOT declare a happy-path-only exception for
`addItem` in any `docs/test-conventions.md`.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 identifies the SUT as `addItem(productId, qty)` (a
unit-test file, not E2E — the refuse rule does not fire). Step 2 §EP:
all three tests cluster into one equivalence class (24-char hex
productId, small positive int qty); no invalid `productId`, no `qty=0`,
no `null` → SHALLOW. Step 2 §BVA: schema declares `qty: { min: 1, max:
99 }`, no test sits at `qty=1` boundary (the values are 1, 2, 3 — only
the minimum boundary is hit, and even that is incidental; the agent
should still flag missing `qty=0`, `qty=99`, `qty=100`) → SHALLOW. Step
2 §NEG: 3 of 3 assertions are positive (`.toEqual`); `addItem`
documents `InvalidQtyError` and `ProductNotFoundError` but no test
asserts either throw → SHALLOW. Verdict per entry point: `SHALLOW` on
all three applicable axes. Per Refuse-to-proceed rule "Clear a test
file where any entry point scores SHALLOW on all three applicable
axes", the file is not cleared. Recommended remediation chain points
at `negative-test-generator` and `boundary-value-generator`.

**Pass condition:** Output contains the literal string `SHALLOW` AND at
least one of `§EP` / `§BVA` / `§NEG` (the named axis tags) AND
references `negative-test-generator` or `boundary-value-generator` (the
named remediation skills). Output does NOT contain a `PASS` verdict line
for the `addItem` entry point.

## Eval 2 — branch — balanced coverage (PASS)

**Input:**

```
Review this PR for shallow input-domain coverage.

Diff (one new unit-test file):

File: src/cart/__tests__/addItem.spec.ts

import { addItem } from '../addItem';
import { InvalidQtyError, ProductNotFoundError } from '../errors';

describe('addItem', () => {
  it('adds qty=1 (lower boundary) of a known product', () => {
    const result = addItem('abc123def456abc123def456', 1);
    expect(result.items[0].qty).toBe(1);
  });

  it('adds qty=99 (upper boundary) of a known product', () => {
    const result = addItem('abc123def456abc123def456', 99);
    expect(result.items[0].qty).toBe(99);
  });

  it('throws InvalidQtyError when qty=0 (below lower boundary)', () => {
    expect(() => addItem('abc123def456abc123def456', 0)).toThrow(InvalidQtyError);
  });

  it('throws InvalidQtyError when qty=100 (above upper boundary)', () => {
    expect(() => addItem('abc123def456abc123def456', 100)).toThrow(InvalidQtyError);
  });

  it('throws ProductNotFoundError when productId is not 24 hex chars (invalid class)', () => {
    expect(() => addItem('not-a-product', 1)).toThrow(ProductNotFoundError);
  });

  it('throws ProductNotFoundError when productId is null', () => {
    expect(() => addItem(null as unknown as string, 1)).toThrow(ProductNotFoundError);
  });
});

SUT signature (from src/cart/addItem.ts):

  /**
   * @param productId 24-char hex string
   * @param qty integer; schema: { min: 1, max: 99 }
   * @throws InvalidQtyError when qty is outside [1, 99]
   * @throws ProductNotFoundError when productId is unknown
   */
  export function addItem(productId: string, qty: number): Cart
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 §EP: tests cover valid product + invalid product
classes (24-hex vs `'not-a-product'` vs `null`) → multi-class → PASS.
Step 2 §BVA: tests at `qty=1` (min), `qty=0` (min-1), `qty=99` (max),
`qty=100` (max+1) — all four boundary points present → PASS. Step 2
§NEG: 3 of 6 assertions are negative (`.toThrow(InvalidQtyError)` and
`.toThrow(ProductNotFoundError)`) → PASS. Verdict per entry point:
`PASS` on all three applicable axes. No Refuse-to-proceed trigger.

**Pass condition:** Output contains the literal string `PASS` for the
`addItem` entry point AND does NOT contain a `SHALLOW` verdict line for
that same entry point. Output references at least one of the three
axes by name (`§EP` / `§BVA` / `§NEG`).

## Eval 3 — adversarial — E2E suite (refuse to proceed)

**Input:**

```
Review this PR for shallow input-domain coverage.

Diff (one new test file):

File: e2e/checkout.spec.ts

import { test, expect } from '@playwright/test';

test.describe('checkout flow', () => {
  test('a logged-in customer can place an order with a valid promo code', async ({ page }) => {
    await page.goto('https://app.example.com/login');
    await page.getByLabel('Email').fill('alice@example.com');
    await page.getByLabel('Password').fill('hunter2');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.goto('https://app.example.com/cart');
    await page.getByRole('button', { name: 'Add BOOK-001' }).click();
    await page.getByLabel('Promo code').fill('WELCOME10');
    await page.getByRole('button', { name: 'Apply promo' }).click();
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page.getByText('Order confirmed')).toBeVisible();
  });
});

The diff includes ONLY this one Playwright E2E file. No unit, no
integration. Step 1 will find a `*.spec.ts` file under `e2e/`.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per the Refuse-to-proceed rule "Operate on integration /
E2E suites where coverage is measured at the system level, not the unit
level. If Step 1 finds only Playwright / Cypress / Selenium files, the
agent emits `not applicable — use e2e-selector-quality-critic for E2E
coverage review` and exits", the agent refuses. Output names
`e2e-selector-quality-critic` (or the documented hand-off) as the right
gate for this input. The agent does NOT emit `§EP` / `§BVA` / `§NEG`
findings against the Playwright test. The agent does NOT issue a
`SHALLOW` or `PASS` verdict.

**Pass condition:** Output contains the literal string `not applicable`
AND references `e2e-selector-quality-critic` (the documented hand-off).
Output does NOT contain a `SHALLOW` verdict line and does NOT contain
a `PASS` verdict line for any entry point.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — the agent's
  `Read` / `Grep` / `Glob` / `Bash(git diff *)` tool surface is not
  exercised since the diff and the SUT signature are supplied inline.
- Pass conditions are literal-substring checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v3.0 / v4.0 framework's
  D7 sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
