---
name: manual-test-script-author
description: "Builds stakeholder-readable scripted manual test cases from a feature spec - emits either a step-table format (preconditions / steps / expected result / actual / pass-fail / notes) for spreadsheet review or a Gherkin Given/When/Then format for BDD-aware teams. Each script is self-contained (no implicit team knowledge), single-scenario (one happy + N edge per script), and includes the data setup the tester needs without being a developer. Use when a feature can't be (or shouldn't be) fully automated and a human tester needs an executable script - UAT, regression baselines, certification testing, exploratory follow-up scripts."
---

# manual-test-script-author

## Overview

Not every test should (or can) be automated. Some need a human:

- **Acceptance / UAT scripts** that go to a non-developer end user.
- **Regression baselines** for legacy code where the cost of
  automation exceeds the test's run frequency.
- **Certification / compliance** scripts that an auditor walks
  step-by-step.
- **First-pass exploration follow-up** - a script formalizing what
  exploratory testing surfaced.

This skill builds those scripts in two interchangeable formats: a
step-table for spreadsheet review or Gherkin for BDD-aware teams.

For session-based exploratory tests (where the script doesn't
predetermine steps), see
[`exploratory-charter-author`](../../../qa-roles/agents/exploratory-charter-author.md).

## When to use

- A feature has stakeholder-visible behavior that's hard to assert
  in code (visual look-and-feel, content review, multi-channel
  flow).
- A non-developer needs to run regression checks (UAT testers,
  product managers, customer support).
- An automated test suite needs a manual fallback for edge cases
  the runner can't reach.

If the feature is fully automatable and the team has the budget,
write an automated test - see
[`acceptance-criteria-extractor`](../../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md)
for the upstream Gherkin generation.

## Step 1 - Read the input

The skill takes one of:

- A user story / PRD section.
- A bug report (for regression-baseline scripts).
- An exploratory testing session debrief (for follow-up scripts).
- An acceptance criterion line item (for UAT scripts).

Extract the **actor**, **trigger**, and **observable outcomes** - 
the same Gherkin structure as
[`acceptance-criteria-extractor`](../../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md).
A manual script is the same logical shape as a Gherkin scenario;
the difference is the level of detail + the inclusion of setup
data.

## Step 2 - Format A: step-table (spreadsheet)

The default format. Reads top-to-bottom; each row is one step the
tester executes:

```markdown
## TC-1234 — Apply promo code at checkout

**Feature:** Checkout — promo codes
**Tester:** ____________________   **Date:** ____________________
**Build:** ____________________   **Environment:** staging | prod

### Preconditions

- [ ] User account `qa-test-user@example.com` exists with valid
      payment method (Stripe test card 4242…) attached.
- [ ] Cart contains 1× SKU `BOOK-001` ($24.99).
- [ ] Promo code `WELCOME10` is active in the admin panel
      (10% off, no minimum).

### Steps

| #  | Action                                                  | Expected result                                                | Actual | Pass/Fail | Notes |
|----|---------------------------------------------------------|----------------------------------------------------------------|--------|-----------|-------|
| 1  | Navigate to `/checkout`.                                  | Cart subtotal shows `$24.99`. Promo input is visible.          |        |           |       |
| 2  | Enter `WELCOME10` in the promo input. Click `Apply`.      | Subtotal updates to `$22.49`. Confirmation toast: "Code applied". |       |           |       |
| 3  | Click `Place order`.                                      | Confirmation page shows order ID. Total `$22.49` (plus tax).   |        |           |       |
| 4  | Check email inbox for `qa-test-user@example.com`.         | Confirmation email arrives within 5 min, total `$22.49`.       |        |           |       |

### Sign-off

**Tester signature:** ____________________
**Sign-off date:** ____________________

### Defects raised

(list)
```

The **Preconditions** block is load-bearing - without it, the
tester improvises setup, and the script's repeatability collapses.
Cite specific test data (account email, SKU, code) so two runs
produce the same result.

## Step 3 - Format B: Gherkin (BDD-aware)

```gherkin
Feature: Apply promo code at checkout

  Background:
    Given a logged-in user "qa-test-user@example.com" with a valid Stripe test card attached
    And the user's cart contains 1× SKU "BOOK-001" ($24.99)
    And promo code "WELCOME10" is active (10% off, no minimum)

  Scenario: Apply valid promo at checkout
    Given the user is on the /checkout page
    When the user enters "WELCOME10" in the promo input
    And the user clicks "Apply"
    Then the subtotal updates from "$24.99" to "$22.49"
    And a confirmation toast appears: "Code applied"

    When the user clicks "Place order"
    Then the confirmation page shows an order ID
    And the order total is "$22.49" (plus tax)
    And a confirmation email arrives within 5 minutes at "qa-test-user@example.com" with total "$22.49"

  Scenario: Apply expired promo at checkout
    Given promo code "EXPIRED50" is inactive (expired 2026-01-01)
    When the user enters "EXPIRED50" in the promo input
    And the user clicks "Apply"
    Then the subtotal remains "$24.99"
    And an error appears: "This code has expired"
```

Same content as Format A, different shape. Pick based on the
team's tooling: spreadsheets prefer A; Cucumber / Behat prefer B.

## Step 4 - Single-scenario discipline

A 30-step script that bundles 5 scenarios (happy path + 4 edge
cases) is unmaintainable. The pattern:

- One TC per **logical scenario** (one happy + one variant per
  TC).
- Edge cases are sibling TCs, not appended steps.

```
TC-1234 — Apply valid promo
TC-1235 — Apply expired promo
TC-1236 — Apply invalid-format promo
TC-1237 — Apply already-used promo
TC-1238 — Apply promo to empty cart
```

The cost is more TCs; the benefit is per-TC pass/fail clarity. A
30-step bundle that fails at step 17 obscures whether step 17 was
the bug or step 12 was a precondition violation.

## Step 5 - Self-contained data

Per [exploratory-wiki][exp]:

[exp]: https://en.wikipedia.org/wiki/Exploratory_testing

> "Most real-world testing combines both approaches" (scripted +
> exploratory) "with emphasis depending on project context."

Manual scripts that depend on "the test data the team uses" or
"whatever account QA has" fail when the next tester runs them. The
script must specify:

- Test account credentials (or "create per the create-account TC
  with these inputs").
- Specific SKUs / product IDs / record IDs.
- Specific test cards / synthetic PII per the canonical sources
  (e.g. Stripe test cards `4242 4242 4242 4242`).
- Expected URLs, button labels, copy text - verbatim where
  copy is checked by the test.

## Step 6 - Defect-raising integration

When a step fails, the tester needs to log a defect with enough
context for the developer to reproduce. The script's **Defects
raised** section captures:

```markdown
| Defect ID | Step  | Expected                          | Actual                           | Severity |
|-----------|-------|-----------------------------------|----------------------------------|----------|
| BUG-9876  |   2   | Subtotal updates to `$22.49`       | Subtotal stays at `$24.99`; toast says "Invalid code" | high    |
```

Pair with [`bug-repro-builder`](../../../qa-bug-repro/agents/bug-repro-builder.md)
for the structured bug-reproduction package.

## Output format

```markdown
## Manual test scripts — `<feature>`

**Source spec:** `<story / PRD / charter>`
**Format:** step-table | gherkin
**Scripts produced:** N
**Estimated wall time per full run:** ~M minutes

| TC ID  | Title                                       | Format     | Wall time | Coverage |
|--------|---------------------------------------------|------------|----------:|----------|
| TC-1234 | Apply valid promo                            | step-table |   ~3 min  | happy path |
| TC-1235 | Apply expired promo                          | step-table |   ~3 min  | edge      |
| TC-1236 | Apply invalid-format promo                   | step-table |   ~2 min  | edge      |

(per-TC bodies follow)

### Test data dependencies

- Account: `qa-test-user@example.com`
- SKUs: `BOOK-001` ($24.99)
- Promo codes: `WELCOME10` (active), `EXPIRED50` (expired)
- Test card: Stripe `4242 4242 4242 4242`

### Author notes

- Each TC is self-contained — no implicit cross-TC dependencies.
- Sign-off block is per-TC; aggregate sign-off via release runbook.
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| One TC bundling 5 scenarios                                            | Failure at step N obscures the cause; reruns repeat all N steps.         | One TC per logical scenario (Step 4). |
| Vague preconditions ("the user is set up")                            | Different testers improvise differently; results diverge.                | Specific account / SKU / data per script (Step 5). |
| Steps without expected results ("click submit")                        | Tester doesn't know what to assert; pass/fail is subjective.             | Every step has an "Expected result" column (Step 2). |
| Manual scripts for fully-automatable features                          | Maintenance burden; diverges from the automated suite.                  | Automate first; manual scripts for the irreducibly-human cases (Use). |
| No defect-raising column                                                | Failures get logged in chat / lost; reproducibility gone.                | Defects-raised block (Step 6); link to bug-repro tooling. |
| Relying on the tester's experience to fill gaps                         | Onboarding new testers becomes painful.                                  | Self-contained scripts; no implicit team knowledge (Step 5). |
| Scripts in PDF / Word that can't be diffed                              | Updates lost; tracking changes manual.                                    | Markdown / Gherkin; version-controlled. |

## Limitations

- **Maintenance overhead.** Manual scripts need updating when the
  product changes. For high-churn areas, automation is cheaper
  long-term.
- **Tester skill matters.** A script can't replace the tester's
  observational judgment ("the toast was visible but the
  animation looked broken").
- **Coverage of edge cases.** Manual scripts cover what the author
  imagined; exploratory testing catches what the author didn't - 
  pair with [`exploratory-charter-author`](../../../qa-roles/agents/exploratory-charter-author.md).

## References

- [exp][exp] - Exploratory vs scripted testing distinction;
  "most real-world testing combines both approaches with emphasis
  depending on project context."
- [`acceptance-criteria-extractor`](../../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md) - upstream: emits Gherkin from a story; this skill turns Gherkin
  into a tester-runnable script.
- [`exploratory-charter-author`](../../../qa-roles/agents/exploratory-charter-author.md) - sibling: when the test is **not** scripted; charter-driven
  exploration instead.
- [`uat-script-author`](../uat-script-author/SKILL.md) - sibling:
  same shape, scoped to UAT.
- [`bug-repro-builder`](../../../qa-bug-repro/agents/bug-repro-builder.md) - downstream: package the manual-test failures into structured
  bug reports.
