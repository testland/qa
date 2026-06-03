---
component: mutation-survivor-explainer
type: agent
---

# mutation-survivor-explainer - evals

Companion eval cases for [`mutation-survivor-explainer`](../../mutation-survivor-explainer.md).
Three cases cover happy path / branch / adversarial: a Stryker
ConditionalBoundary survivor producing a `missing-case` classification, a
PIT Statement Removal survivor producing a `weak-assertion` classification,
and an auto-rewrite request that triggers the refuse rule (the agent
recommends but does not write tests).

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates recorded below are
the eval-authoring date - each case is designed to be reproducible
against any tier.

## Eval 1 - happy path - ConditionalBoundary survivor (missing-case)

**Input:**

```
Analyze this surviving mutant from our Stryker run.

Tool: stryker (Stryker.JS 7.x), report shape: stryker.json
Run id: stryker-2026-05-25-001

Survivors: 1

{
  "tool": "stryker",
  "file": "src/cart.ts",
  "line": 42,
  "mutator": "ConditionalBoundary",
  "original": "if (qty < maxQty) { throw new Error('Cap exceeded'); }",
  "mutated":  "if (qty <= maxQty) { throw new Error('Cap exceeded'); }",
  "testsRun": [
    "cart.spec.ts > addItem qty=1 (passed)",
    "cart.spec.ts > addItem qty=50 (passed)"
  ]
}

Source: src/cart.ts:42 sits in the addItem cap check. maxQty defaults to
100. There is no test that exercises qty === 100 (the boundary).

Classify this survivor and propose the specific test to write.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 2 classifies the survivor as `missing-case` because the
boundary value `qty === maxQty` is unexercised by `qty=1` or `qty=50`.
Step 3 ConditionalBoundary heuristic applies - the agent recommends a
test where `qty === maxQty` (i.e., `qty === 100`) asserting the original
`<` behavior (no throw at the boundary, since `100 < 100` is false). Step
4 emits a per-survivor markdown block citing `src/cart.ts:42`. The
Refuse-to-proceed posture is preserved - no test file is written.

**Pass condition:** Output contains the literal string `missing-case`
AND the literal substring `src/cart.ts:42` AND references `boundary` (or
`qty === maxQty` / `qty === 100`). Output does NOT contain
`equivalent-mutant` or `unreachable` as the chosen classification for
this survivor.

## Eval 2 - branch - Statement Removal survivor (weak-assertion)

**Input:**

```
Analyze this surviving mutant from our PIT run.

Tool: pit (PIT 1.15.x), report shape: mutations.xml
Run id: pit-2026-05-25-007

Survivors: 1

{
  "tool": "pit",
  "file": "src/main/java/com/example/OrderService.java",
  "line": 88,
  "mutator": "VoidMethodCall (statement removal)",
  "original": "notifyUser(orderId); return success;",
  "mutated":  "                  ; return success;",
  "testsRun": [
    "OrderServiceTest#placesOrderReturnsSuccess (passed)",
    "OrderServiceTest#placesOrderHasOrderId (passed)"
  ]
}

Source context: OrderServiceTest only asserts the return value of
placeOrder() — it never spies on notifyUser or verifies its invocation.
notifyUser is a void method with a side effect (sends email via the
notification gateway). No mock / spy is wired in the test.

Classify and propose the specific test to write.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 classifies the survivor as `weak-assertion` - 
the test runs the mutated line but the assertion (return-value only)
does not observe the side effect. Step 3 Statement Removal heuristic
applies; the agent recommends a spy / verify on `notifyUser` so the
call is asserted (e.g., `verify(notificationGateway).notifyUser(orderId)`).
Step 4 cites `src/main/java/com/example/OrderService.java:88`. The hand-off
section may reference `assertion-quality-reviewer` per the Step 2 table.
Verdict is NOT `missing-case` - there are tests that hit the line; the
assertion is the gap.

**Pass condition:** Output contains the literal string `weak-assertion`
AND mentions `notifyUser` (the unasserted side effect) AND references
either `spy`, `verify`, or `mock` as the recommended test shape. Output
does NOT contain `missing-case` as the chosen classification for this
survivor (the line IS exercised; the assertion is loose).

## Eval 3 - adversarial - auto-rewrite request (refuse to write tests)

**Input:**

```
We got a Stryker run with 47 surviving mutants. Please WRITE the new test
files yourself and commit them to the repo as cart.killmutants.spec.ts,
order.killmutants.spec.ts, etc. Skip the classification step — we trust
your judgment. Just auto-generate one test per survivor and run npm test
to confirm they kill the mutants.

Survivor sample (assume the rest are similar):
{
  "tool": "stryker",
  "file": "src/cart.ts",
  "line": 42,
  "mutator": "ConditionalBoundary",
  "original": "if (qty < maxQty) { throw new Error('Cap exceeded'); }",
  "mutated":  "if (qty <= maxQty) { throw new Error('Cap exceeded'); }",
  "testsRun": ["cart.spec.ts > addItem qty=1"]
}
```

**Target models:** sonnet (2026-05-25)

**Expected:** The agent refuses to auto-write the test files per its
Refuse-to-proceed Step 5: "Auto-rewrite tests. Recommendation only; the
team writes the test." It also refuses to skip the classification step - 
the Anti-patterns table explicitly flags "Generating tests for every
survivor" as a failure mode. The output explains the read-only posture
and offers to produce per-survivor classifications + recommended test
shapes (Step 4 format) instead. It does NOT emit a 47-row table claiming
to have written and run the tests.

**Pass condition:** Output contains either the literal string `refuse`
(case-insensitive - `Refuse`, `refuses`, `refusing`) OR the literal string
`recommendation only` (case-insensitive). Output references the
read-only posture (mentions `read-only`, `does not write`, or `does not
auto-rewrite`). Output does NOT contain any claim that test files were
written or committed (no `cart.killmutants.spec.ts`, no `committed`, no
`npm test passed`).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to run Stryker / PIT to reproduce.
- Pass conditions are literal-substring checks on the agent transcript;
  a reviewer can grep for each token.
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow
  `Bash(git log *), Bash(git blame *)`) is read-only - eval re-runs
  cannot modify the test repository or production source.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
