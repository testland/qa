---
component: test-failure-debugger
type: agent
archetype: A1
---

# test-failure-debugger - evals

Companion eval cases for [`test-failure-debugger`](../../test-failure-debugger.md).
Three cases covering happy path (assertion mismatch) + branch (selector
breakage) + adversarial (flake disguised as failure). Re-run by feeding
the **Input** block as the first user message to the agent and comparing
the agent's output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date - 
the eval cases are designed to be re-run by a reviewer against each tier.

## Eval 1 - happy path - assertion mismatch with production constant change

**Input:**

```
Diagnose this failing test. It passed yesterday on commit a1b2c3d, fails today on HEAD.

Test: tests/pricing.test.ts — "applies 8% sales tax"
Source: src/pricing/tax.ts

Captured stderr:
  FAIL  tests/pricing.test.ts > applies 8% sales tax
    AssertionError: expected 41 to equal 42
        Expected: 42
        Actual:   41
        at tests/pricing.test.ts:14:34

Diff a1b2c3d..HEAD -- src/pricing/tax.ts shows:
  -export const SALES_TAX_RATE = 0.08;
  +export const SALES_TAX_RATE = 0.0775;

Last-known-good ref: a1b2c3d
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24), opus (2026-05-24)

**Expected:** Classifies as `assertion-mismatch` with high confidence. Hypothesis names the production constant change (`SALES_TAX_RATE` 0.08 → 0.0775) as the cause. Proposes one of two minimal fixes (revert constant OR update test expectation) and explicitly asks the user which is intent (refuses test-to-fit without confirmation). Output contains a "Verification step" line.

**Pass condition:** Output contains the literal strings `assertion-mismatch` (or `Assertion mismatch`), `SALES_TAX_RATE` (or `0.0775` / `0.08`), AND either "intent" / "which is" / "confirm" (the surfaced ambiguity check). Output does NOT silently propose changing the expected value to 41 without flagging the ambiguity.

## Eval 2 - branch - selector breakage from data-test → data-testid rename

**Input:**

```
Diagnose this failing test. It passed yesterday, fails today after the design-system PR landed.

Test: e2e/checkout.spec.ts — "submits the order"
Source: e2e/checkout.spec.ts, components/SubmitButton.tsx

Captured stderr:
  Error: locator.click: Test timeout of 30000ms exceeded.
  Call log:
    - waiting for locator('button[data-test="submit"]')
    -   locator resolved to 0 elements

Diff main..HEAD -- components/SubmitButton.tsx shows:
  -<button data-test="submit" onClick={...}>
  +<button data-testid="submit" onClick={...}>

Last-known-good ref: main
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24)

**Expected:** Classifies as `selector-breakage` with high confidence. Hypothesis names the attribute rename (`data-test` → `data-testid`) in the production DOM. Proposed fix updates the test's selector from `[data-test="submit"]` to `[data-testid="submit"]`. Confidence is high because Step 1 (locator resolved to 0 elements) AND Step 2 (diff shows attribute rename) align.

**Pass condition:** Output contains the literal strings `selector-breakage` (or `Selector breakage`), `data-test`, AND `data-testid`. Output proposes updating the test selector (not the production attribute) - that is, the Proposed-fix line names the test file path, not `SubmitButton.tsx`. Output does NOT classify as `timing-logic` despite the surface "Test timeout" message - the locator-resolved-to-0 signal takes precedence.

## Eval 3 - adversarial - flake disguised as failure

**Input:**

```
Diagnose this failing test. It fails about 1 in 5 runs lately — sometimes passes on retry, sometimes fails again. Started a couple weeks ago.

Test: e2e/dashboard.spec.ts — "loads recent activity"

Captured stderr:
  Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
  Locator: getByTestId('recent-activity')
  Expected: visible
  Received: hidden

No recent diff on dashboard code. Last 50 runs: 43 passed, 7 failed.
```

**Target models:** sonnet (2026-05-24)

**Expected:** Refuses to classify as a deterministic failure. The "1 in 5 runs" / "sometimes passes on retry" signal AND the 7/50 mixed pass-fail history indicate intermittent behavior, not a consistent failure. The agent recommends `failure-classifier` (for verdict routing) or `qa-flake-triage` agents (specifically `e2e-flake-bisector`). Does NOT emit a "Failure classification:" verdict with one of the five deterministic modes.

**Pass condition:** Output contains at least one of the literal strings `flake`, `flaky`, `intermittent`, `failure-classifier`, OR `qa-flake-triage` (case-insensitive). Output does NOT contain a line of the form `Mode: assertion-mismatch` / `Mode: setup-error` / `Mode: environmental` / `Mode: selector-breakage` / `Mode: timing-logic` (i.e., it refuses to commit to a deterministic-failure verdict).

## Reproducibility notes

- Inputs are concrete pasted-content blocks; no external fixtures.
- Pass conditions are string-match checks; a reviewer can grep the agent's transcript output.
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow `Bash(git diff|log|show *)`) is read-only - eval re-runs do not modify the test repository or production source.
- Eval cases were authored 2026-05-24 against the v3.0 framework's D7 sub-checks (Evals exist, Multi-model coverage, Acceptance criteria, Adversarial coverage, Reproducibility).
