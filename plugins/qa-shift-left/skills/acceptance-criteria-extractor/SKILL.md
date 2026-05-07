---
name: acceptance-criteria-extractor
description: "Reads a user story, PRD section, or feature spec and emits well-formed acceptance criteria as Given/When/Then steps in Gherkin (Feature/Scenario file format) or as a numbered plain-text list. Identifies missing-precondition gaps and proposes Background blocks for shared context. Use after a story is testability-confirmed and before implementation begins."
rating: 25
d6: 5
archetype: S3
---

# acceptance-criteria-extractor

## Overview

ISTQB defines **acceptance criteria** as "the criteria that a work
product must satisfy to be accepted by the stakeholders" (after IREB
Glossary; ISTQB Glossary V4.7.1) ([istqb-ac][istqb-ac]).

[istqb-ac]: https://glossary.istqb.org/en_US/term/acceptance-criteria

This skill takes natural-language story text and emits acceptance
criteria in two interchangeable shapes:

- **Gherkin** (Feature / Scenario / Given / When / Then) — for projects
  that automate via Cucumber, Behat, SpecFlow, pytest-bdd, or any
  Gherkin-aware runner.
- **Plain numbered list** — for projects that prefer human review over
  runner integration; consumable by
  [`spec-to-suite-orchestrator`](../../agents/spec-to-suite-orchestrator.md).

## When to use

- A story has passed the
  [`testability-reviewer`](../../agents/testability-reviewer.md)'s
  Observable / Decidable / Bounded heuristics.
- The team uses behavior-driven development (BDD) and needs
  Gherkin-formatted features.
- A PRD section needs to be decomposed into per-scenario test cases
  before implementation starts.
- The team is migrating from informal stories to a structured
  acceptance-criteria template.

If the input is a **non-functional** requirement (perf / a11y /
security / i18n), use [`nfr-extractor`](../nfr-extractor/SKILL.md)
instead — those have a different shape (thresholds, not Given/When/Then).

## Step 1 — Identify the actor and the trigger

A scenario has three structural pieces per Gherkin
([gherkin-ref][gherkin]):

[gherkin]: https://cucumber.io/docs/gherkin/reference

- **Given** — system context / actor state ("a logged-in user with
  email confirmed").
- **When** — the triggering event ("they click `Save profile`").
- **Then** — the observable outcome ("the email field updates to the
  new value AND a `data-testid="profile-saved-toast"` appears").

Read the input and tag each sentence as a Given / When / Then
candidate. Sentences that describe steady state are Givens; sentences
with verbs of action ("clicks", "submits", "navigates") are Whens;
sentences asserting outcomes are Thens.

## Step 2 — Choose Scenario vs. Scenario Outline

Per [gherkin-ref][gherkin], a **Scenario Outline** is the template
form for running the same scenario with multiple data sets, expanded
via the `Examples:` block:

```gherkin
Scenario Outline: User logs in with various credentials
  Given a user with status "<status>"
  When they submit valid credentials
  Then login returns "<http_status>"

Examples:
  | status      | http_status |
  | active      | 200         |
  | suspended   | 401         |
  | not_verified| 403         |
```

Use Scenario Outline whenever the underlying logic is identical and
only the data varies — typically for boundary checks, role variants,
or status-code matrices.

## Step 3 — Factor out Background

If multiple scenarios share preconditions, extract them to a
**Background** block. Per [gherkin-ref][gherkin], "only one Background
per Feature":

```gherkin
Feature: Profile settings

  Background:
    Given a logged-in user with email confirmed
    And the user is on the /profile/settings page

  Scenario: Update email
    When they change the email field to "new@example.com"
    And they click "Save profile"
    Then the email field shows "new@example.com"
    And a [data-testid="profile-saved-toast"] is visible
```

Don't over-extract — Background is for **truly shared** state (auth,
seed data, navigation). Scenario-specific setup stays in the Given.

## Step 4 — Validate observability of every Then

Per [`testability-reviewer`](../../agents/testability-reviewer.md), every
Then must be observable from outside the system. Reject Thens like:

- "Then the user feels confident." → Not observable.
- "Then the system is secure." → No threshold or test condition.

Replace with:

- "Then a `data-testid="confirmed-icon"` is visible AND has color
  `#3CB371`."
- "Then the response status is 200 AND the `Content-Security-Policy`
  header is present."

## Step 5 — Emit the artifact

### Gherkin output (default)

```gherkin
Feature: <story summary>

  As a <persona>
  I want <capability>
  So that <value>

  Background:
    Given <shared precondition>

  Scenario: <case name>
    Given <state>
    When <event>
    Then <observable outcome>
    And <additional outcome>

  Scenario Outline: <data-driven case>
    Given <state with <param>>
    When <event>
    Then <outcome with <expected>>

    Examples:
      | param | expected |
      | ...   | ...      |
```

### Plain-list output

When the project prefers prose:

```markdown
## Acceptance Criteria

1. **AC-1:** Given <state>, when <event>, then <outcome>.
2. **AC-2:** Given <state>, when <event>, then <outcome>.
3. **AC-3:** ...
```

Plain-list AC numbers (`AC-1`, `AC-2`) become commit-message
references in the implementation PR (`feat: AC-3 — show toast on
save`).

## Step 6 — Flag implicit Givens

The agent never extracts what isn't there. If the story implies a
precondition the author left unstated, **emit a flag** rather than
fabricating:

```markdown
## ⚠ Implicit precondition flagged

The story says "the user updates their profile" without specifying
the user's auth state. Two reasonable readings:

- **Reading A:** Logged-in user (most likely).
- **Reading B:** This includes profile updates by an admin on behalf
  of another user.

Which reading should the Background reflect? (Answer determines
whether we need a second Scenario for the admin path.)
```

Flag-and-ask is the load-bearing pattern. Silently picking Reading A
produces a test suite that misses the admin path; flagging it forces
the author to make the call.

## Output format

```markdown
## Acceptance criteria for `<story-id>`

**Output format:** gherkin | plain-list
**File path:** `<features/<feature-slug>.feature>` (Gherkin) | inline (plain)
**Scenarios produced:** N
**Implicit-precondition flags:** M

### <Gherkin or plain-list output>

### Implicit-precondition flags

<list of flagged questions for the author, if any>

### Coverage notes

- All scenarios pass the testability-reviewer's Observable / Decidable / Bounded heuristics.
- Per-Then assertion targets are concrete (`data-testid` / status code / DOM state).
- Examples table covers <N> data variants for the Outline scenario.
```

## Examples

### Example 1: simple story → 2 scenarios

Input (Linear story):

> "Title: Email update on profile page
>
> As a logged-in user, I want to update my email address from
> `/profile/settings`. After update, the email field shows the new
> value and I see a confirmation toast."

Output:

```gherkin
Feature: Email update on profile page

  As a logged-in user
  I want to update my email address from /profile/settings
  So that my account contact information stays current

  Background:
    Given a logged-in user with email confirmed
    And the user is on the /profile/settings page

  Scenario: Update email to a new valid address
    When the user changes the email field to "new@example.com"
    And the user clicks "Save profile"
    Then the email field shows "new@example.com"
    And a [data-testid="profile-saved-toast"] is visible

  Scenario Outline: Email update validation rejects invalid input
    When the user changes the email field to "<invalid_email>"
    And the user clicks "Save profile"
    Then the email field shows the previous value
    And a [data-testid="email-validation-error"] is visible

    Examples:
      | invalid_email           |
      | not-an-email            |
      | missing@                |
      | @example.com            |
      | spaces in@email.com     |
```

### Example 2: PRD with implicit preconditions

Input (PRD excerpt):

> "We will allow promo codes at checkout. Codes apply 20% off the
> subtotal."

Output:

```markdown
## ⚠ Implicit-precondition flags (3)

1. **Code source.** Where do codes come from — user-entered? auto-applied? Both?
2. **Eligibility.** Are codes user-tier specific (e.g. only new users)?
   Time-limited? Per-user limited?
3. **Subtotal definition.** Subtotal *before* tax / shipping, or *after*?

Without these answers, the test suite cannot be written.
```

The agent refuses to fabricate the missing pieces — instead returns a
question list to the PRD author.

### Example 3: Scenario Outline opportunity

Input:

> "Login should work for active accounts (returning 200) but reject
> suspended (401), unverified (403), and non-existent (404) accounts."

Output:

```gherkin
Feature: Login authorization

  Scenario Outline: Login response per account status
    Given an account with status "<status>"
    When the user submits valid credentials
    Then the response status is <http_status>
    And the response body contains "<error_code>"

    Examples:
      | status        | http_status | error_code           |
      | active        | 200         |                       |
      | suspended     | 401         | ACCOUNT_SUSPENDED    |
      | not_verified  | 403         | EMAIL_NOT_VERIFIED   |
      | not_found     | 404         | ACCOUNT_NOT_FOUND    |
```

## Anti-patterns

| Anti-pattern                                              | Why it fails                                            | Fix |
|-----------------------------------------------------------|---------------------------------------------------------|-----|
| Generating multiple scenarios with copy-pasted Given      | Background extraction missed; suite becomes brittle.    | Extract shared Givens to one Background block. |
| Then with a verb but no observable target ("Then save")   | Not testable — can't assert "save" without observing the side effect. | Emit `data-testid` / response status / DOM state. |
| One Scenario per data variant when a Scenario Outline fits | Test code duplication; Examples table is missed.        | Scenario Outline + Examples. |
| Fabricating preconditions the story didn't state           | Tests pass for the wrong reason; author never confirmed the assumption. | Flag-and-ask. |

## References

- [istqb-ac][istqb-ac] — ISTQB Glossary V4.7.1 canonical definition
  of acceptance criteria.
- [gherkin-ref][gherkin] — Cucumber Gherkin reference: keywords,
  Feature structure, Scenario Outline + Examples, Background rules.
- [`testability-reviewer`](../../agents/testability-reviewer.md) — the
  upstream review that should pass before this skill is invoked.
- [`nfr-extractor`](../nfr-extractor/SKILL.md) — sibling for
  non-functional requirements (different shape).
- [`spec-to-suite-orchestrator`](../../agents/spec-to-suite-orchestrator.md)
  — downstream agent that takes plain-list AC and chains to
  test-case generation.
