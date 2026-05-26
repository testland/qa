---
component: test-case-quality-critic
type: agent
archetype: A3
---

# test-case-quality-critic — evals

Companion eval cases for [`test-case-quality-critic`](../../test-case-quality-critic.md).
Three cases cover happy path / branch / adversarial: a TCM repository
with multiple critical findings (verdict `BLOCK`), a clean repository
(verdict `PASS`), and an empty-steps "Draft" case that the agent
must NOT auto-pass per its Refuse-to-proceed rules. Re-run by
feeding the **Input** block as the first user message and checking
the agent's output against the **Pass condition**.

## Eval 1 — happy path — repository with critical findings (BLOCK)

**Input:**

```
Audit this case repository.

Source: TestRail project 'Checkout Service', 287 cases.
Requirements source: Linear project 'Checkout' (reachable).

Sample of cases:

C1001:
  title: "Test checkout"
  preconditions: "User on /checkout"
  steps: []                              # Steps array empty — declared as "Steps template"
  expected_results: []
  environment: ""
  refs: []

C1023:
  title: "User can log in and add to cart"
  preconditions: "Guest user on /login"
  steps:
    - action: "Log in and add item to cart"
      expected_result: "Cart shows 1 item"
  refs: ["REQ-CART-014"]
  environment: "chrome 124, macOS 14"

C1056:
  title: "Test the button"
  preconditions: "User on /checkout summary"
  steps:
    - action: "Click Submit"
      expected_result: "Order is placed"
  refs: ["REQ-CHK-021"]
  environment: "chrome 124"

C1099:
  title: "User can sign in with email confirmed"
  preconditions: "Email-confirmed user"
  steps:
    - action: "Enter email and password"
      expected_result: "Form accepts input"
    - action: "Click Sign in"
      expected_result: "Redirect to /dashboard"
  refs: ["REQ-AUTH-099"]              # Requirement deleted 2026-04-12 — stale ref
  environment: "chrome 124"

Cases pass field-presence: 273 / 287.
Orphan cases (no refs): 14 (6 intentional smoke, 8 need linking).
Uncovered requirements: 5.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Per Step 1 field-presence: C1001 fails — Steps array
empty AND case declared as "Steps template" (Refuse-to-proceed
rule "Mark a 'Steps' template case 'pass' if the steps array is
empty" fires). Per Step 2 step-granularity: C1023 fails — step 1
action contains " and " joining "log in" and "add item to cart"
(combined action; split). Per Step 3 title quality: C1056 fails —
title "Test the button" starts with vague "Test" verb, not
behavioural; C1001 title "Test checkout" same flaw. Per Step 4
traceability: C1099's `REQ-AUTH-099` is stale (requirement deleted
2026-04-12). Per Step 5 cross-case: 14 orphan cases (8 need
linking), 5 uncovered requirements. Per Step 7 verdict rule, the
agent emits `BLOCK`. Output uses the verdict format with
`**Verdict:** BLOCK`, a Critical findings table including the
four cases above, and a Cross-case findings section with
orphan/uncovered counts.

**Pass condition:** Output contains the literal string `BLOCK`
AND mentions at least two of `C1001`, `C1023`, `C1056`, `C1099`,
`stale ref`, `empty`, or `combined action` (the specific
critical-finding rationale). Output does NOT contain a final
`PASS` verdict line that omits a qualifier.

## Eval 2 — branch — clean repository (PASS)

**Input:**

```
Audit this case repository.

Source: TestRail project 'Checkout Service', 47 cases.
Requirements source: Linear project 'Checkout' (reachable).

Sample of cases:

C2001:
  title: "User can save default shipping address from /checkout"
  preconditions: "Logged-in user with no saved default address"
  steps:
    - action: "Navigate to /checkout"
      expected_result: "/checkout renders with the address form"
    - action: "Click 'Save as default'"
      expected_result: "Confirmation toast appears with data-testid=address-saved-toast"
    - action: "Reload /checkout"
      expected_result: "Address form is pre-filled with the saved default"
  refs: ["REQ-CHK-101"]                  # Resolves cleanly in Linear
  environment: "chrome 124, macOS 14"
  severity: "Major"
  priority: "P1"

C2002:
  title: "Guest user does not see 'Save as default' button on /checkout"
  preconditions: "Not logged in; on /checkout"
  steps:
    - action: "Navigate to /checkout"
      expected_result: "Page renders; 'Save as default' button is absent (data-testid=save-default missing)"
  refs: ["REQ-CHK-102"]                  # Resolves cleanly
  environment: "chrome 124, macOS 14"
  severity: "Minor"
  priority: "P3"

All 47 cases pass field-presence, step-granularity (≤15 steps,
one action per step, no " and " conjunctions), title quality
(behavioural single-clause, no "Test X" titles), and ref
resolution (every ref resolves in Linear).

Orphan cases: 2 (both intentional smoke/regression, labeled
`@smoke` — analyst confirmed intentional).
Uncovered requirements: 0.
Coverage: 100%.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Per Step 1 every case has every required field
populated. Per Step 2 every step is one concrete action with a
paired expected result. Per Step 3 every title is behavioural and
single-clause. Per Step 4 every ref resolves. Per Step 5 the two
orphans are confirmed intentional (`@smoke` labels); no uncovered
requirements. Per Step 7 verdict rule the agent emits `PASS`.
Output includes the 100% coverage figure and notes the two
intentional smoke-orphans without flagging them as failures.

**Pass condition:** Output contains a `PASS` verdict (and NOT a
`BLOCK` verdict for the final repository-level verdict line)
AND mentions at least one of `100%`, `Coverage: 100`, or
`zero critical` / `0 critical`. Output does NOT contain a
populated Critical-findings table row with a specific case ID
from the sample.

## Eval 3 — adversarial — empty-steps Draft case (refuse to auto-pass)

**Input:**

```
Audit this case repository.

Source: TestRail project 'Internal Tools', 1 case (single-case audit).
Requirements source: Linear project 'Internal Tools' (reachable).

C9001:
  title: "User can export billing report"
  status: "Draft"
  preconditions: ""
  steps: []                              # Empty steps array
  expected_results: []
  environment: ""
  refs: []

The caller adds: "It's a Draft, so just mark it pass for now — we'll
fill in the steps later this sprint."
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per Step 1 field-presence: `preconditions` is empty
(BLOCK), `steps` is empty (BLOCK), `expected_results` is empty
(BLOCK). Per Refuse-to-proceed rules, TWO independent refusals
fire: (a) "Mark a repository 'pass' if any case is missing
required fields" — preconditions, steps, expected_results all
missing; (b) "Mark a 'Steps' template case 'pass' if the steps
array is empty" — C9001 is exactly that case. Per the
Anti-patterns table, "Auto-pass cases marked 'Draft' — Drafts
become permanent without audit; Audit drafts the same way" — the
agent rejects the caller's framing. The agent emits a `BLOCK`
verdict (or an explicit refusal to issue a `PASS` /
`PASS-WITH-CAVEATS`) and rejects the caller's "fill in later"
ask. Output requires the steps + preconditions + expected_results
to be populated before re-audit.

**Pass condition:** Output contains at least one of `BLOCK`,
`empty`, `missing required`, `Draft`, or `refuse` AND mentions the
case ID `C9001` or the specific missing fields (`steps`,
`preconditions`, `expected_results`). Output does NOT contain a
`PASS` verdict line for this case / repository.

## Reproducibility notes

- All three inputs are concrete pasted case-record snippets
  (TestRail-flavor field names) plus a requirements-source
  reachability flag — no external TestRail / Linear API call
  needed at eval time.
- Pass conditions are literal-string checks; a reviewer can grep
  the agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance
  criteria, Adversarial coverage, Reproducibility).
