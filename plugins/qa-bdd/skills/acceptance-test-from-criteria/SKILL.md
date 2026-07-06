---
name: acceptance-test-from-criteria
description: "ATDD (Acceptance Test-Driven Development) workflow that generates @AC-N-tagged Gherkin scenarios from a signed-off acceptance-criteria list, scaffolds NotImplementedError step stubs, and produces an AC-to-test traceability table, all before implementation begins, in the team's BDD framework (Cucumber / Behave / Reqnroll). Use when devs are gated on green acceptance tests and failures must map back to a specific criterion. For story-narrative-to-Gherkin without prior ACs, use gherkin-from-stories. For BDD scenario authoring without the ATDD test-first gate, use bdd-scenario-author."
---

# acceptance-test-from-criteria

## Overview

Per ISTQB Glossary V4.7.1: **ATDD (Acceptance Test-Driven
Development)** is "a collaboration-based test-first approach that
defines acceptance tests in the stakeholders' domain language."

The shift-left flow:

```
Story → AC → Acceptance test (this skill) → Implementation → Pass
```

The acceptance test is **written first** (test-first); the
implementation follows; success = test passes.

This is BDD's variant where the AC is the source of truth; the
test is the executable formalization.

## When to use

- The team practices ATDD (test-first from acceptance criteria).
- Each story's acceptance is gated on the corresponding tests
  passing.
- The team wants AC-to-test traceability for compliance / audit.

For Gherkin generation from prose stories, see
[`gherkin-from-stories`](../gherkin-from-stories/SKILL.md). For
upstream AC extraction, see
[`acceptance-criteria-extractor`](../../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md).

## Step 1 - Read the AC list

```markdown
## Acceptance criteria

- AC-1.1: Valid promo "WELCOME10" reduces subtotal by 10%.
- AC-1.2: Expired promo shows the message "This code has expired."
- AC-1.3: Empty promo input shows "Please enter a code."
- AC-1.4: Already-applied promo shows "Already applied" without re-applying.
- AC-1.5: Promo applies before tax (per current pricing logic).
```

Each AC has an ID - preserved end-to-end so test failures map
back.

## Step 2 - One test per AC

```gherkin
# Features/promo-application.feature
Feature: Apply promo code at checkout

  Background:
    Given a logged-in customer
    And the cart contains 1 of "BOOK-001" at $24.99

  @AC-1.1
  Scenario: Valid promo reduces subtotal
    Given promo code "WELCOME10" is active
    When I enter "WELCOME10" in the promo input
    And I click "Apply"
    Then the subtotal updates to $22.49

  @AC-1.2
  Scenario: Expired promo shows error
    Given promo code "EXPIRED50" is inactive
    When I enter "EXPIRED50" in the promo input
    And I click "Apply"
    Then an error appears: "This code has expired"

  @AC-1.3
  Scenario: Empty promo input
    When I enter "" in the promo input
    And I click "Apply"
    Then an error appears: "Please enter a code"

  @AC-1.4
  Scenario: Already-applied promo
    Given promo code "WELCOME10" is active
    And I have already applied "WELCOME10"
    When I enter "WELCOME10" in the promo input
    And I click "Apply"
    Then an error appears: "Already applied"
    And the subtotal remains $22.49

  @AC-1.5
  Scenario: Promo applies before tax
    Given the tax rate for this region is 10%
    And promo code "WELCOME10" is active
    When I enter "WELCOME10" in the promo input
    And I click "Apply"
    Then the subtotal updates to $22.49
    And the tax updates to $2.249 (10% of $22.49)
    And the total is $24.74
```

The `@AC-X.Y` tag is the load-bearing traceability: failing tests
report which AC failed.

## Step 3 - Initial state - all tests fail

Per ATDD, tests are written **before** implementation. Initial
run:

```
Scenario: Valid promo reduces subtotal
  Given promo code "WELCOME10" is active                    # PASS (admin seeding works)
  When I enter "WELCOME10" in the promo input               # PASS (input field exists)
  And I click "Apply"                                        # PASS (button exists)
  Then the subtotal updates to $22.49                       # FAIL - promo logic not implemented

5 of 5 scenarios FAILED (as expected - implementation pending).
```

The failing tests are the work backlog.

## Step 4 - Implementation drives tests green

Engineer implements the promo logic; tests turn green one by one:

```
After implementing valid-promo path:
  AC-1.1 ✅
  AC-1.2 ❌ (expired logic still missing)
  AC-1.3 ❌
  AC-1.4 ❌
  AC-1.5 ❌

After implementing all paths:
  AC-1.1 ✅
  AC-1.2 ✅
  AC-1.3 ✅
  AC-1.4 ✅
  AC-1.5 ✅
```

Story is "done" only when all AC tests pass - per the team's DoD
([`definition-of-done`](../../../qa-process/skills/definition-of-done/SKILL.md)).

## Step 5 - Scaffold new step definitions

The skill detects undefined steps and emits stub definitions:

```python
# features/steps/promo_steps.py

@given('promo code "{code}" is active')
def step_promo_active(context, code):
    raise NotImplementedError(f"Implement: seed promo {code} as active")

@given('promo code "{code}" is inactive')
def step_promo_inactive(context, code):
    raise NotImplementedError(f"Implement: seed promo {code} as expired")

@when('I enter "{code}" in the promo input')
def step_enter_promo(context, code):
    raise NotImplementedError(f"Implement: type {code} in promo input")

@when('I click "{label}"')
def step_click(context, label):
    raise NotImplementedError(f"Implement: click {label}")

@then('an error appears: "{message}"')
def step_error_appears(context, message):
    raise NotImplementedError(f"Implement: assert error message {message}")

@then('the subtotal updates to ${expected:f}')
def step_subtotal(context, expected):
    raise NotImplementedError(f"Implement: assert subtotal == {expected}")
```

The `NotImplementedError` body makes the test failure helpful - 
the engineer knows exactly what to implement.

The implementations land in PRs alongside the production code.

## Step 6 - Traceability artifact

```markdown
## AC-to-test mapping - `<story>` (auto-generated)

| AC ID    | Test                                               | Status   | Last run |
|----------|----------------------------------------------------|----------|----------|
| AC-1.1    | `promo-application.feature:8` (Valid promo)         | ✅ pass  | 2026-05-05 |
| AC-1.2    | `promo-application.feature:14` (Expired)            | ✅ pass  | 2026-05-05 |
| AC-1.3    | `promo-application.feature:20` (Empty)              | ✅ pass  | 2026-05-05 |
| AC-1.4    | `promo-application.feature:25` (Already applied)    | ✅ pass  | 2026-05-05 |
| AC-1.5    | `promo-application.feature:32` (Tax interaction)    | ✅ pass  | 2026-05-05 |

**Coverage:** 5/5 AC covered by tests. Story is testable per ATDD.
```

This artifact answers: "Did we test what the customer asked for?"
A 1:1 mapping of AC → test → status answers it definitively.

## Step 7 - Run via the team's framework

**Default: match the team's existing BDD runner** - ATDD lives or dies by adoption, and forcing a runner switch alongside test-first authoring stalls both. Use the team's incumbent runner (Cucumber-JVM, Behave, or Reqnroll). Pick a new runner only when no incumbent exists; in that case default to the runner matching the production stack's primary language (JVM → Cucumber-JVM, Python → Behave, .NET → Reqnroll).

```bash
# Cucumber-JVM
mvn test -Dcucumber.filter.tags='@AC-1.1 or @AC-1.2 or @AC-1.3 or @AC-1.4 or @AC-1.5'

# Behave
behave --tags=@AC-1.1 --tags=@AC-1.2 --tags=@AC-1.3 --tags=@AC-1.4 --tags=@AC-1.5

# Reqnroll
dotnet test --filter "Category=AC-1.1|Category=AC-1.2|..."
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Tests written after implementation                                    | Defeats ATDD; tests verify what was built, not what was asked.           | Test-first; tests precede implementation. |
| Tests without `@AC-X.Y` tag                                            | No traceability; story acceptance unverifiable.                          | Tag every Scenario (Step 2). |
| One mega-scenario covering all ACs                                     | Failure mid-scenario doesn't pinpoint which AC failed.                   | One Scenario per AC (Step 2). |
| Auto-generated step bodies that pass silently                          | Tests appear green; production code never runs.                          | `NotImplementedError` (Step 5). |
| Skipping the AC-to-test artifact                                       | Compliance / audit gap.                                                   | Generate per Step 6 each release. |
| AC tests in the same suite as unit tests                               | Mixed feedback; harder to interpret.                                     | Separate `features/acceptance/` suite. |

## Limitations

- **Requires the team to write ACs first.** Doesn't apply to teams
  without explicit AC artifacts.
- **AC quality drives test quality.** Vague AC → vague test (or
  many implicit-precondition flags per
  [`gherkin-from-stories`](../gherkin-from-stories/SKILL.md) Step 5).
- **Doesn't replace lower-layer tests.** ATDD covers the AC layer;
  unit / integration coverage still needed for non-AC logic.

## References

- [`acceptance-criteria-extractor`](../../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md) - upstream: emits the AC this skill consumes.
- [`gherkin-from-stories`](../gherkin-from-stories/SKILL.md) - 
  sibling: story-first variant.
- [`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md) - step library this skill draws from + adds to.
- [`cucumber-testing`](../cucumber-testing/SKILL.md),
  [`behave-testing`](../behave-testing/SKILL.md),
  [`reqnroll-testing`](../reqnroll-testing/SKILL.md) - runners.
- [`definition-of-done`](../../../qa-process/skills/definition-of-done/SKILL.md) - DoD that requires AC tests to pass.
- ISTQB Glossary V4.7.1 - `https://glossary.istqb.org/en_US/term/acceptance-test-driven-development`
  defines ATDD as "a collaboration-based test-first approach."
