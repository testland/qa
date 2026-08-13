# Review rubric: worked examples

A weak case scored against the axes, then its rewrite re-scored to PASS. The
axis definitions, Gate 0, scoring rules, and conventions live in the Review
rubric section of the `test-case-anatomy-reference` SKILL.md.

## A weak case, scored

The case as written:

```text
ID:            TC-07
Title:         Test checkout
Preconditions: System is ready
Steps:
  1. Log in and go to the cart
  2. Enter a coupon
  3. Click #btn-checkout-submit
  4. Verify the order
Expected:      Checkout works correctly
Refs:          (blank)
```

Gate 0: passes. Every required field has content, so the case is scorable.

| Axis | Verdict | Evidence |
|---|---|---|
| A1 Objective specificity | `FAIL` | "Test checkout" names a feature, not a behavior. A reader cannot tell which of the dozen things checkout does is under test, so they cannot tell whether the case passed for the right reason. |
| A2 Precondition executability | `FAIL` | "System is ready" is not a state. Ready with which account, which cart contents, which build, which coupon configured? Two testers will set up two different systems and get two different results. |
| A3 Step granularity | `FAIL` | Step 1 combines two interactions ("log in" and "go to the cart"). No step carries a paired expected result, so a failure at step 2 is indistinguishable from a failure at step 4. Step 4 leads with `Verify`, which names no interaction. |
| A4 Step abstraction match | `WEAK` | The objective is a business flow, but step 3 is a DOM selector. The case will break on a markup change that does not affect checkout behavior. |
| A5 Expected-result observability | `FAIL` | "Checkout works correctly" is not observable. There is no value, state, or message to compare against, so two testers can disagree about whether the case passed. |
| A6 Traceability validity | `WEAK` | Reference is blank and no exploratory justification is given. WEAK rather than FAIL: the case is still runnable, it just does not report coverage. |

**Case verdict: `FAIL`.** Four axes fail. This is not a case that needs polishing;
it is a case that needs writing.

## The rewrite

```text
ID:            CHECKOUT-TC-07
Title:         Applies a 10 percent coupon to the order subtotal before tax

Preconditions:
  - Account checkout-qa@example.com exists, is verified, and has an empty cart
  - Coupon SAVE10 is active: 10 percent off subtotal, no minimum spend,
    expires 2027-01-01
  - Build web 4.12.0 on staging, Chrome 138, locale en-US, tax rate 8 percent

Inputs:        SKU DEMO-001 at 100.00 USD, quantity 1, coupon SAVE10,
               test card 4242 4242 4242 4242

Steps:
  1. Sign in as checkout-qa@example.com
     -> Account menu shows checkout-qa@example.com
  2. Add SKU DEMO-001, quantity 1, to the cart
     -> Cart badge shows 1; cart subtotal shows 100.00 USD
  3. Open the cart and apply coupon SAVE10
     -> Discount line shows 10.00 USD off; subtotal shows 90.00 USD
  4. Complete payment with card 4242 4242 4242 4242
     -> Confirmation shows order total 97.20 USD
        (90.00 discounted subtotal plus 7.20 tax at 8 percent)

Postconditions: Order exists in status paid; the account's cart is empty
Refs:           REQ-CHECKOUT-114 (percentage coupons apply before tax)
```

Re-scored:

| Axis | Verdict | What changed |
|---|---|---|
| A1 | `PASS` | The title names one observable behavior (coupon applies before tax) and one verification. The ordering claim is the whole point of the case and is now visible in the title. |
| A2 | `PASS` | Account, coupon configuration, build, browser, locale, and tax rate are all named. A second tester reaches the same starting state. |
| A3 | `PASS` | Four steps, one interaction each, each with a paired expected result. A failure now localizes to a step. |
| A4 | `PASS` | Steps are phrased at the business layer the objective claims, with concrete inputs. No DOM selectors, because no DOM mechanic is under test. |
| A5 | `PASS` | Every expected result is a number or a string on screen. The arithmetic is shown, so the case doubles as its own oracle: a reviewer can check 90.00 plus 7.20 without opening the requirement. |
| A6 | `PASS` | Resolves to `REQ-CHECKOUT-114`, and the parenthetical says which clause of it. |

**Case verdict: `PASS`.**

One thing the rewrite cannot fix on its own: S1 and S2 are set-level. This case
covers exactly one partition (a valid percentage coupon, no minimum spend). The
review should therefore emit a follow-up list rather than declare coverage done:
expired coupon, coupon below a minimum spend, coupon at exactly the minimum spend
and one cent under it, and a coupon that would drive the subtotal below zero.
