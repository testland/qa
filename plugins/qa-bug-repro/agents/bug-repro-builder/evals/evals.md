---
component: bug-repro-builder
type: agent
archetype: A2
---

# bug-repro-builder - evals

Companion eval cases for [`bug-repro-builder`](../../bug-repro-builder.md).
Three cases cover happy path / branch / adversarial: unit-test layer for
a function-level bug in a Vitest repo (canonical artifact), E2E layer
for a Playwright multi-page checkout flow (different framework + layer),
and refusing to proceed when the bug report is missing the Expected
field. Re-run by feeding the **Input** block as the first user message
and checking the agent's output against the **Pass condition**.

## Eval 1 - happy path - unit test in a Vitest repo

**Input:**

```
Generate a failing test for this bug report.

## Bug report — #1234

**Summary:** formatPhoneNumber('+44 20 1234 5678') returns
'(+44 20 12) 345-678' instead of '+44 20 1234 5678'.

**Environment:** Node 20.11.0, Vitest 1.2.x.

**Steps to Reproduce:**
1. Call formatPhoneNumber('+44 20 1234 5678') in src/lib/format-phone-number.ts

**Expected:** Output equals '+44 20 1234 5678' (international numbers
preserved untouched per the international-format spec).

**Actual:** Output equals '(+44 20 12) 345-678' (the US-domestic
formatter is applied to international input).

**Severity:** medium
**Priority:** [set by triage]
**Reproducibility:** Always.

Repo facts:
  - package.json includes "vitest": "^1.2.0" and "test": "vitest run"
  - Sibling file src/lib/format-phone-number.ts exists and exports
    formatPhoneNumber.
  - Existing test file src/lib/format-phone-number.test.ts has 3
    passing US-domestic cases; no international cases.

Assume `npx vitest run src/lib/format-phone-number.test.ts` returns:
```
FAIL src/lib/format-phone-number.test.ts > preserves international numbers untouched
  AssertionError: expected '(+44 20 12) 345-678' to be '+44 20 1234 5678'
Tests: 1 failed, 3 passed (4)
```
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 reads the structured report. Step 2 detects the
framework as `vitest` (from `package.json`). Step 3 selects **unit
test** layer per the "Function returns wrong value for input X" row of
the layer-selection table. Step 4 writes a new test case (it appends to
the existing `src/lib/format-phone-number.test.ts` rather than creating
a new file, since one already exists) with an `it('preserves
international numbers untouched (regression for #1234)', ...)` assertion
that calls `formatPhoneNumber('+44 20 1234 5678')` and expects the
verbatim international output. Step 5 reports running the test once
and quotes the verbatim failure output. Step 6 emits the artifact path
+ run output per the output format block - `Layer chosen: unit`, `Test
framework: vitest`, `Test path: src/lib/format-phone-number.test.ts`,
the captured failure substring including `AssertionError`. The agent
does NOT fix the bug or modify any existing passing tests.

**Pass condition:** Output contains the literal string
`Layer chosen: unit` AND `Test framework: vitest` AND `AssertionError`
(the verbatim failure substring confirming the test runs red). Output
does NOT modify or remove any of the 3 existing passing US-domestic
test cases.

## Eval 2 - branch - E2E test in a Playwright repo (different framework + layer)

**Input:**

```
Generate a failing test for this bug report.

## Bug report — #2002

**Summary:** Multi-step checkout fails at the shipping-address step
when the postal code field is left blank — the Next button stays
disabled instead of showing an inline validation error.

**Environment:** Chromium 138, Playwright 1.42, Node 20.

**Steps to Reproduce:**
1. Open https://shop.example.com/checkout
2. Click "Continue to shipping" (passes — cart is non-empty).
3. Fill street, city, and country, but leave postal-code blank.
4. Click "Next".

**Expected:** The form shows an inline error
`Postal code is required` next to the postal-code input, and the Next
button remains disabled.

**Actual:** No inline error appears. The Next button remains disabled
silently — the user is given no feedback.

**Severity:** medium
**Priority:** [set by triage]
**Reproducibility:** Always (3/3 manual repros).

Repo facts:
  - package.json includes "@playwright/test": "^1.42.0"
  - tests/checkout.spec.ts exists with a happy-path checkout test that
    fills all fields.
  - playwright.config.ts is at the repo root.

Assume `npx playwright test tests/checkout.spec.ts --grep "postal-code required"`
returns:
```
✘ tests/checkout.spec.ts:67 - postal-code required validation
  Error: expect(getByText('Postal code is required')).toBeVisible()
  Timed out 5000ms waiting for element to be visible.
1 failed, 0 passed
```
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 detects framework as `@playwright/test` (Playwright).
Step 3 selects **E2E** layer per the "Multi-page user flow fails at step
N" row of the layer-selection table. Step 4 writes a new Playwright
test that walks steps 1-4 of the bug report, asserts the `Postal code
is required` inline error is visible, and asserts the Next button stays
disabled. Step 5 runs the test once and captures the verbatim
`Timed out 5000ms waiting for element to be visible` output. Step 6
emits `Layer chosen: e2e`, `Test framework: playwright`, the test path
under `tests/`, and the captured failure. The agent does NOT modify
the existing happy-path test in `tests/checkout.spec.ts`.

**Pass condition:** Output contains the literal string `Layer chosen:
e2e` AND `Test framework: playwright` AND mentions `Postal code is
required` (the load-bearing literal from the bug). Output does NOT
choose a unit-test layer (the multi-page flow rules out unit).

## Eval 3 - adversarial - bug report missing Expected (refuse to proceed)

**Input:**

```
Generate a failing test for this bug report. Repo is vitest-based.

## Bug report — #3030

**Summary:** Something is wrong with the date picker.

**Environment:** Chrome.

**Steps to Reproduce:**
1. Open the date picker.
2. Click around.

**Expected:** [not filled in by the reporter]

**Actual:** It does something weird.

**Severity:** medium
**Priority:** [set by triage]
**Reproducibility:** Sometimes.

Repo facts:
  - package.json includes "vitest": "^1.2.0"
  - src/components/DatePicker.tsx exists.
  - No related existing test files.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Step 1 reads the report and finds the **Expected** field
is `[not filled in by the reporter]` and the **Actual** field
("something weird") is non-load-bearing prose. There is no specific
assertion to encode and no input/output pair to anchor the failing
test on. Without an Expected value, the agent CANNOT write a
regression-prevention test - a passing "failing test" is worse than no
test (the agent's body explicitly states this). The agent halts and
recommends running the report through
[`bug-report-template`](../skills/bug-report-template/SKILL.md) first to
fill the missing fields (or through
[`bug-report-from-recording`](../bug-report-from-recording.md) if a
trace is available). It does NOT generate a placeholder test, does
NOT modify any source files, does NOT run a test runner.

**Pass condition:** Output contains the substring `Expected` AND one
of `missing` / `not filled` / `incomplete` (the agent surfaces the
missing-field problem). Output mentions
`bug-report-template` (the recommended upstream step). Output does
NOT contain `Layer chosen:` (no test artifact emitted).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks including the
  bug report, repo facts, and the simulated test-runner output. No
  external repo clone needed.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
