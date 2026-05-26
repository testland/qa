---
component: test-case-quality-auditor
type: agent
archetype: A3
---

# test-case-quality-auditor — evals

Companion eval cases for [`test-case-quality-auditor`](../../test-case-quality-auditor.md).
Three cases cover happy path / branch / adversarial: a TestRail CSV
export with a vague title + non-testable expected result producing a
FAIL verdict, a parameter-aware case set covering equivalence /
boundary classes producing a PASS verdict, and a `.spec.ts` file
supplied as input that triggers the `WRONG_TOOL` refuse rule.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates recorded below are
the eval-authoring date — each case is designed to be reproducible
against any tier.

## Eval 1 — happy path — vague title + non-testable expected (FAIL)

**Input:**

```
Audit this TestRail CSV export of the checkout test-case set.

File: tests/cases/checkout-cases.csv (TestRail export, 4 cases)

case_id,title,precondition,steps,expected,source_claim
CHECKOUT-LIVE-12,"Verify checkout works","User is logged in and cart has 1 item","1. Go to checkout. 2. Enter card. 3. Submit.","checkout works correctly",Story
CHECKOUT-LIVE-07,"Rejects coupon when length exceeds 32 chars","User is logged in; cart has 1 item; coupon field visible","1. Enter coupon of 33 characters. 2. Apply.","Either client validation blocks at 32; or server returns 422.",AC-12
CHECKOUT-LIVE-04,"Places order with a valid card on the happy path","User is logged in; cart has 1 item ($25); card 4242... on file","1. Open checkout. 2. Confirm card. 3. Submit. 4. Wait for confirmation page.","Confirmation page shows order number and total $25.00 within 5 seconds",AC-09
CHECKOUT-LIVE-21,"Should be tested","system is ready","1. Do the thing","it works",TBD

No project-specific docs/test-case-conventions.md present.
No upstream source artifact attached (the AC-09 / AC-12 / Story
references are the only traceability anchors).

Run the audit.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 identifies the input as `tracker-csv`. Step 2
walks each case. CHECKOUT-LIVE-12 fails §1 (title "Verify checkout
works" — the case-version of `it('it works')`) and §4 (expected
"checkout works correctly" not testable). CHECKOUT-LIVE-21 fails §1
(title "Should be tested"), §2 ("system is ready" is non-specific
precondition), §4 ("it works" non-testable), §8 (source_claim "TBD").
CHECKOUT-LIVE-07 is WEAK on §4 (disjunctive expected — collapse after
first run). CHECKOUT-LIVE-04 is PASS across axes. Step 3 set-level
notes the small sample. Verdict line: at least 2 FAIL cases.

**Pass condition:** Output contains the literal string `FAIL` (the
per-case verdict) AND names both `CHECKOUT-LIVE-12` AND
`CHECKOUT-LIVE-21` as failing cases. Output mentions §1 (`Title
clarity`) or §4 (`Expected-result testability`) as the failing axis.
Output does NOT mark CHECKOUT-LIVE-04 as FAIL (that case is PASS-shape).

## Eval 2 — branch — parameter-aware set with EP + BV coverage (PASS)

**Input:**

```
Audit this markdown matrix produced by `test-case-ideation-from-story`.

File: tests/cases/coupon-validation-matrix.md

| id  | title                                          | tier      | precondition                                         | steps                                                                                  | expected                                                                              | source_claim |
|-----|------------------------------------------------|-----------|------------------------------------------------------|----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|--------------|
| C-01| Accepts valid 8-char alphanumeric coupon       | smoke     | User on checkout with cart ≥ $1; coupon field shown  | 1. Enter "SUMMER25" (valid 8 chars). 2. Apply.                                         | Discount line item "Coupon SUMMER25 -$5.00" added; cart total reduced by $5.          | AC-12        |
| C-02| Accepts valid coupon at 32-char upper bound    | regression| Same as C-01                                         | 1. Enter "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345" (32 chars). 2. Apply.                       | Discount line item shows the coupon; cart total reduced per coupon rules.             | AC-12        |
| C-03| Rejects coupon at 33-char upper bound + 1      | negative  | Same as C-01                                         | 1. Enter a 33-char string. 2. Apply.                                                   | Client-side validation blocks Apply; error text "Coupon must be 32 chars or less".    | AC-12        |
| C-04| Rejects empty coupon                            | negative  | Same as C-01                                         | 1. Leave coupon empty. 2. Click Apply.                                                 | Apply button disabled; or click is a no-op (no network call, no error toast).         | AC-12        |
| C-05| Rejects whitespace-only coupon                  | negative  | Same as C-01                                         | 1. Enter "   " (3 spaces). 2. Apply.                                                   | Same as empty coupon — Apply disabled or no-op.                                       | AC-12        |
| C-06| Rejects 256-char coupon (far upper bound)       | edge      | Same as C-01                                         | 1. Enter a 256-char string. 2. Apply.                                                  | Client truncates to 32 chars OR validation blocks. (No 500.)                          | AC-12        |
| C-07| Rejects coupon with SQL-like payload            | negative  | Same as C-01                                         | 1. Enter "'); DROP TABLE coupons;--". 2. Apply.                                        | Server returns 422 "invalid coupon"; no error in coupon service logs.                 | AC-13        |

docs/test-case-conventions.md: not present (apply default conventions).

Source artifact attached: docs/stories/coupon-validation.md with AC-12
("Coupon must be 1-32 chars; empty rejected; oversize truncated or
blocked") and AC-13 ("Coupon input is escaped; no SQLi").

Run the audit.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 identifies `markdown-matrix`. Step 2 — all 7 cases
have specific titles, identifiable preconditions, declarative steps,
testable expected results, source_claim → AC. Step 3 set-level:
identifier consistency PASS (C-NN pattern), source-claim provenance
PASS (100% trace to AC-12 / AC-13). §5 equivalence partitioning PASS —
valid (C-01, C-02), invalid (C-03, C-04, C-05, C-06, C-07) classes
all present. §6 boundary value PASS — min-1 / min / max / max+1
covered (empty + whitespace-only / 8 / 32 / 33). Tier distribution
healthy. Verdict: PASS.

**Pass condition:** Output contains the literal string `PASS` (the
verdict line for the set) AND mentions either `equivalence` or `EP`
(the §5 axis being satisfied) AND mentions either `boundary` or `BV`
(the §6 axis being satisfied). Output does NOT contain `FAIL` against
any of C-01..C-07 (no case in this set is shaped to fail).

## Eval 3 — adversarial — test code supplied (refuse, WRONG_TOOL)

**Input:**

```
Audit this test file for case quality. Make sure the assertions are
testable and the test names are clear.

File: tests/cart.spec.ts

describe('cart', () => {
  it('addItem increments count', () => {
    const cart = createCart();
    cart.addItem({ id: 'sku-1', qty: 1 });
    expect(cart.itemCount).toBe(1);
  });

  it('removeItem decrements count', () => {
    const cart = createCart();
    cart.addItem({ id: 'sku-1', qty: 2 });
    cart.removeItem('sku-1');
    expect(cart.itemCount).toBe(0);
  });

  it('should work', () => {
    const cart = createCart();
    expect(cart).toBeDefined();
  });
});

This is the entire input. Treat the `it()` blocks as test cases and
audit them per the case-quality axes.
```

**Target models:** sonnet (2026-05-25)

**Expected:** The agent refuses per Refuse-to-proceed: "Operate on test
code files. Step 1 fails-closed with `WRONG_TOOL` if `.spec.*` /
`.test.*` / `.feature` files are supplied." It emits the documented
refuse string and recommends `test-code-critic` (the named hand-off for
test code review). It does NOT score the `it()` blocks against §1-§8;
it does NOT emit a per-case findings table; it does NOT emit a PASS /
WEAK / FAIL verdict for individual `it` blocks.

**Pass condition:** Output contains the literal string `WRONG_TOOL`
(the documented refuse code) AND mentions `test-code-critic` (the
named per-test hand-off). Output does NOT contain a per-case verdict
line for `addItem increments count` or `removeItem decrements count`
(no `FAIL` / `WEAK` / `PASS` against the named `it()` blocks).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — no external
  TestRail / Qase / Xray API access needed. The CSV / markdown matrix
  / `.spec.ts` content is inlined.
- Pass conditions are literal-substring checks on the agent transcript;
  a reviewer can grep for each token.
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow `Bash(jq
  *), Bash(csvkit *)`) is read-only — eval re-runs cannot mutate the
  tracker or the case files.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
