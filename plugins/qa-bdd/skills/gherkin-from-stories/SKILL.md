---
name: gherkin-from-stories
description: "Build-an-X workflow that converts user stories into Gherkin scenarios - extracts the actor / capability / value triple from \"As a … I want … so that …\", maps acceptance criteria to Scenario blocks, identifies parameterizable axes for Scenario Outlines, and emits a Feature file ready for `bdd-step-library-curator`-curated step definitions. Sister to `acceptance-criteria-extractor` (qa-shift-left) - that one handles the AC layer; this skill operates at the user-story layer and produces Gherkin directly. Emits Gherkin only: no step definition stubs and no runner detection. For a full runnable artifact (Feature file plus scaffolded step definitions), use bdd-scenario-author, which wraps this skill."
---

# gherkin-from-stories

## Overview

The shift-left flow:

```
User story → Acceptance Criteria → Gherkin Feature → Step definitions → Tests
```

[`acceptance-criteria-extractor`](../../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md)
covers the AC layer (it can emit Gherkin too). This skill is a
**direct user-story → Gherkin** path for teams that author
Gherkin features as the primary artifact (skipping the
intermediate AC step).

## When to use

- The team's BDD process starts with user stories, not separate
  AC docs.
- A PM hands engineers a story and the team's first artifact is
  the `.feature` file.
- A migration from non-BDD to BDD wants to convert existing
  stories into Gherkin in bulk.

If the team uses AC docs as primary, use
[`acceptance-criteria-extractor`](../../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md);
this skill is the user-story-first variant.

## Step 1 - Extract the user-story triple

```markdown
# Story: Apply promo code at checkout

**As a** logged-in customer
**I want** to apply a promotional code at checkout
**So that** I receive the advertised discount on my order
```

The triple maps to the Feature header:

```gherkin
Feature: Apply promo code at checkout

  As a logged-in customer
  I want to apply a promotional code at checkout
  So that I receive the advertised discount on my order
```

If the story doesn't have the triple, **flag and ask** - a story
without explicit value is a signal the team should clarify before
testing.

## Step 2 - Extract acceptance criteria

The story body usually has a list:

```markdown
## Acceptance criteria

- Valid promo applies the discount and shows confirmation.
- Expired promo shows an error message.
- Invalid promo shows "Code not found."
- Empty input shows "Please enter a code."
- Already-applied promo shows "Already applied."
```

Each AC becomes a Scenario:

```gherkin
  Background:
    Given I am a logged-in customer
    And my cart contains 1 item at $24.99

  Scenario: Apply valid promo
    Given promo code "WELCOME10" is active
    When I enter "WELCOME10" in the promo input
    And I click "Apply"
    Then the subtotal updates to $22.49
    And a confirmation toast appears: "Code applied"

  Scenario: Apply expired promo
    Given promo code "EXPIRED50" is inactive
    When I enter "EXPIRED50" in the promo input
    And I click "Apply"
    Then an error appears: "This code has expired"
```

## Step 3 - Identify Scenario Outline opportunities

Multiple ACs that vary only in input data become a Scenario
Outline:

```gherkin
  Scenario Outline: Promo validation rejects bad input
    When I enter "<code>" in the promo input
    And I click "Apply"
    Then an error appears: "<error>"

    Examples:
      | code         | error                 |
      | EXPIRED50    | This code has expired |
      | NOTREAL      | Code not found        |
      | (empty)      | Please enter a code   |
      | WELCOME10*2  | Already applied       |
```

Per [`acceptance-criteria-extractor`](../../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md)
Step 2: "Use Scenario Outline whenever the underlying logic is
identical and only the data varies."

## Step 4 - Use existing steps from the library

Per
[`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md),
the team has a curated step library. Use existing steps where
possible:

```gherkin
# Use existing step:
Given I am a logged-in customer

# vs (avoid):
Given I have authenticated to the system   # NEW STEP - duplicates "I am a logged-in customer"
```

Before authoring a new step, search the library README.

## Step 5 - Flag implicit Givens

Stories often imply preconditions:

```markdown
## Story

A customer can apply a promo code.
```

Implicit:
- Customer must be on the checkout page (where? `/checkout`?
  `/cart`?).
- Cart must be non-empty (otherwise no checkout).
- Customer must be authenticated (or guest checkout supported?).

Flag instead of guess:

```markdown
## ⚠ Implicit Given flags (3)

1. Where does the user enter the promo? `/checkout`? `/cart`?
2. What's the cart state? Empty? Multi-item?
3. Authentication required? Guest checkout supported?

The Gherkin Feature can't be authored without these answers.
```

Same flag-and-ask pattern as
[`acceptance-criteria-extractor`](../../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md)
Step 6.

## Step 6 - Validate Gherkin style

The output should pass
[`gherkin-style-reviewer`](../../agents/gherkin-style-reviewer.md)
checks:

- Declarative steps ("I apply a promo") not imperative ("I click
  the button with id #apply-promo-btn").
- Every Then has an observable outcome.
- No technical leakage (DB names, internal API endpoints).

## Step 7 - Output

```markdown
## Gherkin scenarios for `<story>`

**Source story:** `LIN-1234` (Apply promo code at checkout)
**Implicit-precondition flags:** N
**Scenarios produced:** M
**Step library reuse:** K of M scenarios use existing steps only.

### Generated Feature

(per Step 2-3)

### Implicit-precondition flags

(per Step 5)

### New steps required

| Step                                          | Why new |
|-----------------------------------------------|---------|
| `Given promo code {code} is active`            | New domain (admin promo state) |
| `When I enter {code} in the promo input`        | New element (promo input field) |

### Recommended next step

After PM clarifies the implicit Givens (per flags above), author
the new step definitions per
[`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md)
conventions. Pair with the framework's runner per the team's stack
(`cucumber-testing` / `behave-testing` / `reqnroll-testing`).
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Fabricating implicit Givens                                            | Tests pass for the wrong reason; PM never confirmed.                    | Flag-and-ask (Step 5). |
| One Scenario per AC even when they should be Outline                  | Test code duplication.                                                    | Detect outline opportunities (Step 3). |
| Not consulting the step library                                        | Step proliferation; library bloats.                                      | Search library first (Step 4). |
| Imperative steps ("click button #foo")                                 | Couples to UI; defeats BDD's value.                                       | Declarative ("I apply a promo") (Step 6). |
| Skipping the As-a / I-want / So-that header                            | Loses the value framing.                                                  | Triple at the Feature top (Step 1). |

## Limitations

- **Story quality drives output quality.** Vague stories produce
  vague Gherkin (or many flags).
- **Step library dependency.** Without one, every step is "new" and
  the proliferation problem manifests.
- **Doesn't run the tests.** This skill emits Gherkin; pair with
  the runner skills + step authoring.

## References

- [`acceptance-criteria-extractor`](../../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md) - sibling: AC-first variant.
- [`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md) - step library this skill draws from.
- [`gherkin-style-reviewer`](../../agents/gherkin-style-reviewer.md) - output-quality check.
- [`acceptance-test-from-criteria`](../acceptance-test-from-criteria/SKILL.md) - sibling: ATDD-flavored variant.
