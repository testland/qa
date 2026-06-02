---
component: test-code-critic
type: agent
archetype: A3
---

# test-code-critic - evals

Companion eval cases for [`test-code-critic`](../../test-code-critic.md).
Three cases cover happy path / branch / adversarial: AAA / naming /
magic-number / single-responsibility violations flagged with §convention
references, a clean test file with no issues, and a production-code
input that triggers the refuse-to-proceed rule (this agent refuses to
review non-test files). Re-run by pasting the **Input** block as the
first user message and checking the agent's output against the
**Pass condition**.

## Eval 1 - happy path - multi-§ violations (§1 / §2 / §3 / §7)

**Input:**

```
Review this test file (the only file in the PR diff) against the
test-code-conventions §1-§10 reference. The file is
tests/cart.spec.ts and there is no project-level docs/test-conventions.md
override.

import { Cart } from '../src/cart';

describe('Cart', () => {
  it('works', () => {
    const cart = new Cart();
    cart.addItem({ sku: 'BOOK-001', qty: 1, price: 42 });
    cart.addItem({ sku: 'BOOK-002', qty: 2, price: 42 });
    cart.applyPromo('FALL10');
    expect(cart.itemCount).toBe(3);
    expect(cart.totalPrice).toBe(113.4);
    expect(cart.status).toBe('active');
    expect(cart.promoCode).toBe('FALL10');
    cart.checkout();
    expect(cart.status).toBe('checked_out');
    cart.refund(42);
    expect(cart.refundAmount).toBe(42);
    expect(cart.status).toBe('refunded');
  });
});
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 confirms `tests/cart.spec.ts` matches a test-file
path. Step 2 walks the body and flags: §3 naming - `it('works')` matches
the `\b(it|test)\(['"]?(works?|should|...)` regex; §2 single-
responsibility - multiple distinct observable properties asserted
(`itemCount`, `totalPrice`, `status`, `promoCode`, `refundAmount`) in
the same test; §1 AAA structure - the body interleaves Act
(`cart.checkout()`, `cart.refund(42)`) with Assert without visible
separation; §7 magic numbers - `42` appears 3 times. Output cites the
§ numbers and references `test-code-conventions`.

**Pass condition:** Output contains the literal string `§3` (or
`Naming`) AND `§2` (or `Single-responsibility`) AND `§7` (or
`Magic numbers`) AND mentions one of `it('works')` / `works` /
`describe('Cart')`. Output does NOT claim the test passes the
single-responsibility convention.

## Eval 2 - branch - clean test file (no findings)

**Input:**

```
Review this test file (the only file in the PR diff) against the
test-code-conventions §1-§10 reference. The file is
tests/cart-promo.spec.ts; there is no project-level
docs/test-conventions.md override.

import { describe, it, expect } from 'vitest';
import { Cart } from '../src/cart';

const PROMO_CODE_FALL10 = 'FALL10';
const FALL10_DISCOUNT_RATE = 0.10;

describe('Cart.applyPromo', () => {
  it('cart_with_FALL10_promo_reduces_total_by_10_percent', () => {
    // Arrange
    const cart = new Cart();
    cart.addItem({ sku: 'BOOK-001', qty: 1, price: 100 });

    // Act
    cart.applyPromo(PROMO_CODE_FALL10);

    // Assert — single observable property: discounted total
    expect(cart.totalPrice).toBe(100 * (1 - FALL10_DISCOUNT_RATE));
  });
});
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 confirms test-file path. Step 2 finds nothing to
flag: §1 AAA is visually separated by `// Arrange` / `// Act` /
`// Assert` comments; §2 single-responsibility is satisfied (one
`expect` on one observable property, `cart.totalPrice`); §3 naming uses
the `<sut>_<scenario>_<expected>` convention; §7 magic numbers are
factored into named constants (`PROMO_CODE_FALL10`,
`FALL10_DISCOUNT_RATE`). The findings table reports 0 issues.

**Pass condition:** Output contains one of `no issues` / `no findings` /
`Issues flagged: 0` / `0 issues` (case-insensitive) OR the per-file
findings table for `tests/cart-promo.spec.ts` is empty or absent.
Output does NOT contain `§3` / `§2` / `§7` listed as a flagged finding
on this file.

## Eval 3 - adversarial - refuse on production code

**Input:**

```
Review this file (the only file in the PR diff) against the
test-code-conventions §1-§10 reference. The file is src/cart.ts.

export class Cart {
  private items: Array<{ sku: string; qty: number; price: number }> = [];
  private _promoCode: string | null = null;

  addItem(item: { sku: string; qty: number; price: number }) {
    if (item.qty <= 0) throw new Error('qty must be positive');
    this.items.push(item);
  }

  applyPromo(code: string) {
    this._promoCode = code;
  }

  get itemCount(): number {
    return this.items.reduce((n, it) => n + it.qty, 0);
  }

  get totalPrice(): number {
    const subtotal = this.items.reduce((s, it) => s + it.qty * it.price, 0);
    return this._promoCode === 'FALL10' ? subtotal * 0.9 : subtotal;
  }
}
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per Step 1's filter (test-file path regex) and the
Refuse-to-proceed rule "Review production code (Step 1)," this file is
`src/cart.ts` - production code, not a test file. The path matches
none of `\.spec\.[jt]sx?$` / `\.test\.[jt]sx?$` / `test_*.py` /
`*_test.go` / `*Test.java` / `*.spec.rb`. The body contains no `test(` /
`it(` / `describe(` / `def test_` / `func Test`. The agent emits the
documented refusal message ("This agent reviews test code only.
Production code is the job of production-reviewer agents (saturated in
the ecosystem). For test code review of `<file>`, the file must match
a test path convention.") and does NOT emit a per-file findings table
or §convention flags for this file.

**Pass condition:** Output contains the literal string `production code`
(case-insensitive) AND one of `test path` / `test file` / `not a test`
(case-insensitive). Output does NOT contain any of `§1` / `§2` / `§3` /
`§6` / `§7` / `§10` as a flagged finding row, and does NOT emit a per-
file issues table claiming to have audited `src/cart.ts`. The agent
must not claim to have reviewed production code - that is the entire
adversarial point of the eval.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a sample repo. Tool surface (`Read`,
  `Grep`, `Glob`, narrow `Bash(git diff *)`) is read-only.
- Pass conditions are literal-substring checks; a reviewer can grep
  the agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
