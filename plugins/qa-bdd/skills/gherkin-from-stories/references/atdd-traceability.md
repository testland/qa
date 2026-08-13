# ATDD from an acceptance-criteria list - tags, stubs, traceability

Deep reference for `gherkin-from-stories` ("from an acceptance-criteria
list" input shape). Consult when the team practices ATDD and needs the
full tagged-scenario, red-first, traceability workflow.

Per ISTQB Glossary V4.7.1, **ATDD (Acceptance Test-Driven Development)** is
"a collaboration-based test-first approach that defines acceptance tests in
the stakeholders' domain language"
(`https://glossary.istqb.org/en_US/term/acceptance-test-driven-development`).
The flow: `Story → AC → Acceptance test → Implementation → Pass`. The
acceptance test is **written first**; the implementation follows; success =
test passes.

## One tagged test per AC

Input AC list (each AC has an ID - preserved end-to-end so test failures
map back):

```markdown
## Acceptance criteria

- AC-1.1: Valid promo "WELCOME10" reduces subtotal by 10%.
- AC-1.2: Expired promo shows the message "This code has expired."
- AC-1.3: Empty promo input shows "Please enter a code."
- AC-1.4: Already-applied promo shows "Already applied" without re-applying.
- AC-1.5: Promo applies before tax (per current pricing logic).
```

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

The `@AC-X.Y` tag is the load-bearing traceability: failing tests report
which AC failed.

## Initial state - all tests fail

Per ATDD, tests are written **before** implementation. Initial run:

```
Scenario: Valid promo reduces subtotal
  Given promo code "WELCOME10" is active           # PASS (admin seeding works)
  When I enter "WELCOME10" in the promo input      # PASS (input field exists)
  And I click "Apply"                              # PASS (button exists)
  Then the subtotal updates to $22.49              # FAIL - promo logic not implemented

5 of 5 scenarios FAILED (as expected - implementation pending).
```

The failing tests are the work backlog. Implementation drives them green
one by one; the story is "done" only when all AC tests pass - per the
team's DoD (`definition-of-done` in the qa-process plugin).

## Scaffold new step definitions

Detect undefined steps and emit stub definitions whose bodies raise:

```python
# features/steps/promo_steps.py

@given('promo code "{code}" is active')
def step_promo_active(context, code):
    raise NotImplementedError(f"Implement: seed promo {code} as active")

@when('I enter "{code}" in the promo input')
def step_enter_promo(context, code):
    raise NotImplementedError(f"Implement: type {code} in promo input")

@then('an error appears: "{message}"')
def step_error_appears(context, message):
    raise NotImplementedError(f"Implement: assert error message {message}")

@then('the subtotal updates to ${expected:f}')
def step_subtotal(context, expected):
    raise NotImplementedError(f"Implement: assert subtotal == {expected}")
```

The `NotImplementedError` body makes the test failure helpful - the
engineer knows exactly what to implement. Auto-generated step bodies that
pass silently are the cardinal ATDD sin: tests appear green while
production code never runs.

## Traceability artifact

```markdown
## AC-to-test mapping - `<story>` (auto-generated)

| AC ID  | Test                                             | Status  | Last run |
|--------|--------------------------------------------------|---------|----------|
| AC-1.1 | `promo-application.feature:8` (Valid promo)      | pass    | 2026-05-05 |
| AC-1.2 | `promo-application.feature:14` (Expired)         | pass    | 2026-05-05 |
| AC-1.3 | `promo-application.feature:20` (Empty)           | pass    | 2026-05-05 |
| AC-1.4 | `promo-application.feature:25` (Already applied) | pass    | 2026-05-05 |
| AC-1.5 | `promo-application.feature:32` (Tax interaction) | pass    | 2026-05-05 |

**Coverage:** 5/5 AC covered by tests. Story is testable per ATDD.
```

This artifact answers "Did we test what the customer asked for?" - a 1:1
mapping of AC → test → status answers it definitively, and closes the
compliance / audit gap.

## Run via the team's framework

**Default: match the team's existing BDD runner** - ATDD lives or dies by
adoption, and forcing a runner switch alongside test-first authoring stalls
both. Use the incumbent runner (Cucumber-JVM, Behave, or Reqnroll). Pick a
new runner only when no incumbent exists; then default to the production
stack's primary language (JVM → Cucumber-JVM, Python → Behave,
.NET → Reqnroll).

```bash
# Cucumber-JVM
mvn test -Dcucumber.filter.tags='@AC-1.1 or @AC-1.2 or @AC-1.3 or @AC-1.4 or @AC-1.5'

# Behave
behave --tags=@AC-1.1 --tags=@AC-1.2 --tags=@AC-1.3 --tags=@AC-1.4 --tags=@AC-1.5

# Reqnroll
dotnet test --filter "Category=AC-1.1|Category=AC-1.2|..."
```

## ATDD-specific anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Tests written after implementation | Defeats ATDD; tests verify what was built, not what was asked | Test-first; tests precede implementation |
| Tests without `@AC-X.Y` tag | No traceability; story acceptance unverifiable | Tag every Scenario |
| One mega-scenario covering all ACs | Failure mid-scenario doesn't pinpoint which AC failed | One Scenario per AC |
| Auto-generated step bodies that pass silently | Tests appear green; production code never runs | `NotImplementedError` stubs |
| Skipping the AC-to-test artifact | Compliance / audit gap | Generate the mapping each release |
| AC tests in the same suite as unit tests | Mixed feedback; harder to interpret | Separate `features/acceptance/` suite |
