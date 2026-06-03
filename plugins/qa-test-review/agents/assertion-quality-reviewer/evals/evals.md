---
component: assertion-quality-reviewer
type: agent
---

# assertion-quality-reviewer - evals

Companion eval cases for [`assertion-quality-reviewer`](../../assertion-quality-reviewer.md).
Three cases cover happy path / branch / adversarial: a wide-vague matcher
flagged for replacement, a fully-specific suite that produces no
high-priority findings, and a production-code path that triggers the
refuse-to-proceed rule. Re-run by pasting the **Input** block as the first
user message and matching the agent's output against the **Pass condition**.

## Eval 1 - happy path - wide-vague matcher (`wide-vague` finding)

**Input:**

```
Please review the assertion quality of this Jest test file (the only file
in the PR diff). Per the team's convention reference,
`test-code-conventions` §4 governs assertion specificity.

// cart.spec.ts
import { Cart } from '../src/cart';

describe('Cart', () => {
  it('returns a cart on construction', () => {
    const cart = new Cart();
    expect(cart).toBeTruthy();
  });

  it('returns an error when checkout has no items', () => {
    const cart = new Cart();
    const err = cart.checkout();
    expect(err).toBeInstanceOf(Error);
  });

  it('returns 201 on successful POST /cart', async () => {
    const response = await fetch('/cart', { method: 'POST', body: '{}' });
    expect(response.status).toBeGreaterThan(199);
  });

  it('includes an error message on failure', async () => {
    const response = await fetch('/cart/invalid');
    const body = await response.text();
    expect(body).toContain('error');
  });
});
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 identifies 4 Jest assertions. Step 2 classifies:
`expect(cart).toBeTruthy()` as `wide-vague` (passes for any non-falsy
value; recommend `.toEqual({ items: [], total: 0 })`),
`expect(err).toBeInstanceOf(Error)` as `wide-vague` (right type, wrong
message blind; recommend `expect(err.code).toBe(...)` /
`.toMatch(...)`), `expect(response.status).toBeGreaterThan(199)` as
`narrow-vague` (test name says 201; recommend `.toBe(201)`), and
`expect(body).toContain('error')` as `match-vague` (passes for "no
errors"; recommend `.toMatch(/^error: /)` or structured matcher). Step
3 emits a findings table with at least one `wide-vague` row and a
high-priority section. No assertion is rated `specific`.

**Pass condition:** Output contains the literal string `wide-vague` AND
at least one of `.toBe(true)` / `.toEqual` / `.toBe(201)` (a specific
recommended replacement). Output does NOT claim every assertion is
`specific`.

## Eval 2 - branch - fully specific suite (no high-priority findings)

**Input:**

```
Review assertion quality of this Vitest test file (the only file in the
PR diff).

// pricing.spec.ts
import { describe, it, expect } from 'vitest';
import { computeTotal } from '../src/pricing';

describe('computeTotal', () => {
  it('sums a single line item', () => {
    const total = computeTotal([{ sku: 'BOOK-001', price: 12.50, qty: 1 }]);
    expect(total).toBe(12.50);
  });

  it('applies the 10% promo when promoCode is FALL10', () => {
    const total = computeTotal(
      [{ sku: 'BOOK-001', price: 100, qty: 1 }],
      { promoCode: 'FALL10' },
    );
    expect(total).toEqual(90);
  });

  it('rejects an unknown promoCode with a typed error', () => {
    expect(() => computeTotal([], { promoCode: 'NOPE' }))
      .toThrowError(/^PromoCodeNotFound: NOPE$/);
  });
});
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 finds 3 assertions. Step 2 classifies all 3 as
`specific` - `.toBe(12.50)`, `.toEqual(90)`, and `.toThrowError(/^...$/)`
(anchored regex). Step 3 emits a findings table dominated by the
`specific` row; the High-priority (wide-vague), Medium-priority
(narrow-vague), and Low-priority (match-vague) sections each report
zero findings or are omitted as empty.

**Pass condition:** Output contains the literal string `specific` AND
does NOT contain `wide-vague` listed as a finding count >0 (the
findings table row for `wide-vague` reads 0). Output does NOT recommend
replacing `.toBe(12.50)` / `.toEqual(90)` / `.toThrowError(/^...$/)`.

## Eval 3 - adversarial - refuse on production code

**Input:**

```
Review assertion quality on this file (the only file in the PR diff).

// src/cart.ts
export class Cart {
  private items: Array<{ sku: string; qty: number }> = [];

  addItem(sku: string, qty: number) {
    if (qty <= 0) throw new Error('qty must be positive');
    this.items.push({ sku, qty });
  }

  get itemCount() {
    return this.items.reduce((n, item) => n + item.qty, 0);
  }
}
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per the Refuse-to-proceed rule "Review production code.
Same rule as `test-code-critic`," the agent refuses to issue an
assertion-quality verdict on this file. The input has no `expect(...)` /
`assert(...)` / matcher calls - it is production code, not a test file.
The agent emits the production-code refusal message naming
`test-code-critic`'s convention, and does NOT emit a findings table
classifying any assertion as `specific` / `wide-vague` / `narrow-vague` /
`match-vague`.

**Pass condition:** Output contains the literal string `test-code-critic`
(named in the Refuse-to-proceed cross-reference) AND mentions one of
`production code` / `test files only` / `not a test file` (case-insensitive).
Output does NOT contain a findings table row labelled `wide-vague`,
`narrow-vague`, `match-vague`, or `specific` (the agent must not claim
to have rated assertions in production code - that is the entire
adversarial point of the eval).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a sample repo. The agent's tool surface
  (`Read`, `Grep`, `Glob`) is read-only - eval re-runs cannot modify
  the test repo.
- Pass conditions are literal-substring checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
