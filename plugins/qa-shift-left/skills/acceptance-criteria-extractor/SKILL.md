---
name: acceptance-criteria-extractor
description: "Reads a user story, PRD section, or feature spec and emits well-formed acceptance criteria as Given/When/Then steps in Gherkin (Feature/Scenario file format) or as a numbered plain-text list. Identifies missing-precondition gaps and proposes Background blocks for shared context. Use after a story is testability-confirmed and before implementation begins."
---

# acceptance-criteria-extractor

## Overview

This skill takes natural-language story text and emits acceptance
criteria ([ISTQB][istqb-ac]) in two interchangeable shapes:

[istqb-ac]: https://glossary.istqb.org/en_US/term/acceptance-criteria

- **Gherkin** (Feature / Scenario / Given / When / Then) - for projects
  that automate via Cucumber, Behat, SpecFlow, pytest-bdd, or any
  Gherkin-aware runner.
- **Plain numbered list** - for projects that prefer human review over
  runner integration; consumable by a downstream test-generation step.

## When to use

- A story has passed the Observable / Decidable / Bounded testability
  heuristics.
- The team uses behavior-driven development (BDD) and needs
  Gherkin-formatted features.
- A PRD section needs to be decomposed into per-scenario test cases
  before implementation starts.
- The team is migrating from informal stories to a structured
  acceptance-criteria template.

If the input is a **non-functional** requirement (perf / a11y /
security / i18n), use `non-functional-requirement-extractor`
instead - those have a different shape (thresholds, not Given/When/Then).

## Step 1 - Identify the actor and the trigger

Read the input and tag each sentence as a **Given** (system context /
actor state), **When** (the triggering event), or **Then** (the
observable outcome, e.g. a `data-testid="profile-saved-toast"` appears)
per Gherkin ([gherkin-ref][gherkin]). Sentences describing steady state
are Givens; sentences with action verbs ("clicks", "submits",
"navigates") are Whens; sentences asserting outcomes are Thens.

[gherkin]: https://cucumber.io/docs/gherkin/reference

## Step 2 - Choose Scenario vs. Scenario Outline

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
only the data varies - typically for boundary checks, role variants,
or status-code matrices.

## Step 3 - Factor out Background

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

Don't over-extract - Background is for **truly shared** state (auth,
seed data, navigation). Scenario-specific setup stays in the Given.

## Step 4 - Validate observability of every Then

Every Then must be observable from outside the system. Reject Thens like:

- "Then the user feels confident." → Not observable.
- "Then the system is secure." → No threshold or test condition.

Replace with:

- "Then a `data-testid="confirmed-icon"` is visible AND has color
  `#3CB371`."
- "Then the response status is 200 AND the `Content-Security-Policy`
  header is present."

## Step 5 - Emit the artifact

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
references in the implementation PR (`feat: AC-3 - show toast on
save`).

## Step 6 - Flag implicit Givens

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

- All scenarios pass the Observable / Decidable / Bounded testability heuristics.
- Per-Then assertion targets are concrete (`data-testid` / status code / DOM state).
- Examples table covers <N> data variants for the Outline scenario.
```

## Examples

Three worked examples (simple story, PRD with implicit preconditions,
Scenario Outline opportunity) are in
[references/examples.md](references/examples.md).

## Anti-patterns

| Anti-pattern                                              | Why it fails                                            | Fix |
|-----------------------------------------------------------|---------------------------------------------------------|-----|
| Generating multiple scenarios with copy-pasted Given      | Background extraction missed; suite becomes brittle.    | Extract shared Givens to one Background block. |
| Then with a verb but no observable target ("Then save")   | Not testable - can't assert "save" without observing the side effect. | Emit `data-testid` / response status / DOM state. |
| One Scenario per data variant when a Scenario Outline fits | Test code duplication; Examples table is missed.        | Scenario Outline + Examples. |
| Fabricating preconditions the story didn't state           | Tests pass for the wrong reason; author never confirmed the assumption. | Flag-and-ask. |

## References

- [istqb-ac][istqb-ac] - ISTQB Glossary V4.7.1 canonical definition
  of acceptance criteria.
- [gherkin-ref][gherkin] - Cucumber Gherkin reference: keywords,
  Feature structure, Scenario Outline + Examples, Background rules.
- `non-functional-requirement-extractor` - sibling for
  non-functional requirements (different shape).
