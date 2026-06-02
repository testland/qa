---
name: manual-step-to-gherkin
description: "Translates an existing manual test step (table row, prose bullet, TestRail/Qase exported step) into a declarative Gherkin Given/When/Then step phrased in business language - strips UI mechanics (\"clicks the button\", \"types in the field\"), elevates the user intent (\"signs in\", \"adds the product\"), and aligns vocabulary with the project's existing step library. Distinct from `gherkin-from-stories` (which works from user stories, not from already-written manual steps) and from `acceptance-test-from-criteria` (which works from acceptance criteria). Use when a team is migrating manual test scripts to BDD, or when a manual tester is handing a script off to an automation engineer."
rating: 23
d6: 4
archetype: S3
---

# manual-step-to-gherkin

## Overview

A manual test script and a Gherkin scenario describe the same behavior at different abstraction levels. Manual scripts are imperative ("click the Add to Cart button, then verify the cart count is 1"); Gherkin steps should be declarative ("the customer adds a product to their cart, then their cart shows one item"). The conversion looks mechanical but goes wrong in a predictable way: junior automation engineers translate UI mechanics one-for-one and produce brittle, implementation-coupled scenarios that Cucumber's own guidance explicitly warns against (https://cucumber.io/docs/bdd/better-gherkin/).

This skill is the rules-based translator that takes a manual step and emits the declarative Gherkin equivalent. It is the handoff artifact between manual QA and automation engineers - and it is also the migration tool when a team moves from manual-script-driven QA (TestRail / Qase / Xray manual cases) to BDD.

## When to use

- A manual tester has written a script (or a TestRail / Qase / Xray case) and is handing it off to an automation engineer.
- A team is migrating their existing manual case library to Cucumber / SpecFlow / Reqnroll / Behave.
- A test-management tool (TestRail, Qase, Xray) needs its imperative steps re-expressed as Gherkin for a BDD pipeline.
- A reviewer is auditing existing Gherkin for declarative-vs-imperative violations.

Do **not** use this skill when:

- The starting point is a user story, not an existing manual step - go to [`gherkin-from-stories`](../gherkin-from-stories/SKILL.md).
- The starting point is acceptance criteria - go to [`acceptance-test-from-criteria`](../acceptance-test-from-criteria/SKILL.md).
- The team has explicitly chosen imperative Gherkin (rare; some legacy teams). The skill defaults to declarative per Cucumber's guidance.

## Step 1 - Classify the manual step

Read the step and tag it:

| Tag | Pattern | Example |
|---|---|---|
| **UI mechanic** | Verbs like "click", "tap", "type", "press", "select from dropdown", "navigate to", "scroll" combined with a UI element. | "Click the *Add to Cart* button" |
| **State assertion** | "Verify", "check", "confirm", "ensure" combined with an observable property. | "Verify the cart count is 1" |
| **Business action** | A domain-level verb already (signs in, places order, cancels subscription). | "User signs in with valid credentials" |
| **Setup / precondition** | "Given that…", "Assuming…", "Pre-requisite:". | "Given the user is logged in" |
| **Observation / data inspection** | "Note the order ID for later use", "record the timestamp". | "Capture the response time" |

UI mechanics and state assertions are the two types this skill rewrites. Business actions are already declarative - pass them through. Setup gets converted to `Given`. Observations are typically dropped from Gherkin and lifted into step-definition implementation details.

## Step 2 - Apply declarative-rewrite rules

Per Cucumber's better-Gherkin guidance, "scenarios should describe the intended behaviour of the system, not the implementation" (https://cucumber.io/docs/bdd/better-gherkin/). The test for whether a step is too imperative: would the wording need to change if the implementation changed (e.g., the UI moved from a button to a voice command)? If yes, rewrite.

### Rule R1 - Remove UI mechanics

| Imperative | Declarative |
|---|---|
| "Click the *Add to Cart* button" | "the customer adds a product to their cart" |
| "Type `[email protected]` in the email field" | "the customer signs in as `[email protected]`" |
| "Press the *Submit* button" | "the customer submits the form" |
| "Select *USA* from the country dropdown" | "the customer chooses USA as their country" |
| "Scroll to the bottom of the page" | (drop - implementation detail; Gherkin should not require it) |

### Rule R2 - Collapse multi-step UI sequences into one business action

A manual script that says:
> 1. Type `[email protected]` in the email field
> 2. Type `validPassword123` in the password field
> 3. Click the *Submit* button

…becomes one Gherkin step:
> When the customer signs in with valid credentials

The five-line manual sequence collapses to a one-line `When` because the **business action** is "signing in", not "clicking, typing, clicking". The mechanics live in the step definition.

### Rule R3 - Replace UI properties with observable outcomes

| Imperative | Declarative |
|---|---|
| "Verify the cart count is 1" | "their cart contains one item" |
| "Confirm the *Submit* button is disabled" | "the form cannot be submitted" |
| "Check that the URL is `/dashboard`" | "the customer is on the dashboard" |
| "Verify that the green checkmark appears" | "the operation is confirmed" |

### Rule R4 - Choose the right keyword

| Manual step intent | Gherkin keyword |
|---|---|
| Setup state that exists before the user does anything in this scenario | `Given` |
| The user (or system) takes an action under test | `When` |
| An observable consequence is asserted | `Then` |
| Add detail to a previous step (same keyword type) | `And` |
| Negate / contrast a previous step | `But` |

Cucumber's docs are explicit that `And` and `But` inherit the type of the previous keyword - they are not interchangeable with `Given`/`When`/`Then` (https://cucumber.io/docs/gherkin/reference/).

### Rule R5 - Preserve the project's existing vocabulary

Before emitting the rewrite, scan the project's existing Gherkin features for the same business action. If "the customer signs in" is already used, do not introduce "the user logs in" - vocabulary drift fragments the step library and forces step-definition duplication. The [`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md) skill audits and consolidates that vocabulary.

## Step 3 - Emit the rewrite

Output is a markdown table side-by-side, so a reviewer can confirm semantic equivalence:

| Manual step (input) | Gherkin step (output) | Keyword | Justification |
|---|---|---|---|
| Click the *Add to Cart* button on the `SKU-001` product page | the customer adds `SKU-001` to their cart | `When` | R1 strips UI mechanic; business action elevated |
| Verify the cart count is 1 | their cart contains one item | `Then` | R3 swaps UI property for observable outcome |
| Type `[email protected]` in email; `valid` in password; click *Submit* | the customer signs in as `[email protected]` | `When` | R2 collapses three UI mechanics to one business action |
| Pre-requisite: User is logged in | the customer is signed in | `Given` | R4 chooses Given for setup |
| Note the order ID | (dropped - implementation detail) | - | Out-of-scope for Gherkin per R1 |

The agent assembles the surviving rows into a Scenario:

```gherkin
Scenario: Customer adds an in-stock product to their cart
  Given the customer is signed in
  When the customer adds SKU-001 to their cart
  Then their cart contains one item
```

## Step 4 - Validate against project conventions

Before handing the Gherkin to the automation engineer:

1. **Check the project step library** for matching existing steps. If `the customer adds <SKU> to their cart` already exists with parameter capture, the rewrite reuses it; if not, flag the new step for [`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md) review.
2. **Confirm the scenario has at most one `When`.** Multiple `When`s in one scenario indicate two scenarios were collapsed; split them.
3. **Lint with the project's Gherkin linter** (gherkin-lint, picklesdoc, or the IDE's built-in). Most teams pin a small ruleset (no-multiple-when, no-empty-feature, file-name-convention).
4. **Diff the rewrite against the manual step's expected outcome** - semantic equivalence is the bar, not literal-translation fidelity. If the manual step asserts "cart count is 1" but the rewrite asserts "cart is non-empty", that is a regression in specificity, not a successful abstraction.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One-for-one translation that keeps "the customer clicks the button" | Brittle to UI changes; Cucumber explicitly warns against this (https://cucumber.io/docs/bdd/better-gherkin/). | Apply R1 strictly. |
| Multiple `When`s in one scenario after collapsing | Indicates the scenario actually contains two business actions. | Split into two scenarios. |
| Inventing new vocabulary when the project already has matching steps | Vocabulary drift fragments the step library and forces duplicate step definitions. | Step 4 cross-references the existing library. |
| Dropping all `Then` assertions because they "look like UI checks" | The scenario becomes unverifiable; manual scripts always have an expected outcome. | R3 rewrites assertions; doesn't drop them. |
| Translating *every* UI mechanic, including ones that ARE business-relevant | "Selects USA as country" may be load-bearing; "scrolls to footer" is not. | R1's table is a guide, not an exhaustive substitution rule - preserve domain-meaningful selections. |
| Producing Gherkin that requires a comment to explain | If the scenario needs a `# this means…` comment, the rewrite is wrong. | Make the scenario self-explanatory; the natural language IS the comment. |

## Limitations

- **Vocabulary alignment is the bottleneck, not translation.** The mechanics of declarativization are rules-based; aligning with the project's existing step library requires reading that library. For large projects, run [`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md) first to canonicalize the vocabulary.
- **Some manual steps are inherently UI-mechanical.** Accessibility tests that assert "the *Skip to main* link is the first focusable element" are not rewriteable into business language without losing the spec. Pass these through with R1 disabled and flag them in the Scenario as `@a11y` for the team to decide.
- **Numerical specificity is preserved, not abstracted.** "Cart count is 1" stays "cart contains one item" - not "cart is non-empty". Specificity is the load-bearing part of the assertion.
- **Output is a draft.** A human reviews the side-by-side before merging into the feature file; the skill does not auto-merge.

## Hand-off targets

- **Convert the resulting Gherkin into runnable step definitions** → [`cucumber-testing`](../cucumber-testing/SKILL.md), [`specflow-testing`](../specflow-testing/SKILL.md), [`reqnroll-testing`](../reqnroll-testing/SKILL.md), [`behave-testing`](../behave-testing/SKILL.md).
- **Audit the project's step library for vocabulary drift** → [`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md).
- **If the source is a user story, not a manual step** → [`gherkin-from-stories`](../gherkin-from-stories/SKILL.md).
- **If the source is an AC list, not a manual step** → [`acceptance-test-from-criteria`](../acceptance-test-from-criteria/SKILL.md).
- **If the team is generating a test-case matrix from a story (upstream of this skill)** → [`test-case-ideation-from-story`](../../../qa-process/skills/test-case-ideation-from-story/SKILL.md).

## References

- Cucumber documentation - Better Gherkin (declarative vs imperative; "scenarios should describe the intended behaviour of the system, not the implementation"): https://cucumber.io/docs/bdd/better-gherkin/
- Cucumber documentation - Gherkin reference (keyword semantics: `Given` / `When` / `Then` / `And` / `But`): https://cucumber.io/docs/gherkin/reference/
- ISTQB glossary - behavior-driven development: https://glossary.istqb.org/en_US/term/behavior-driven-development
- ISTQB glossary - test procedure (the imperative form this skill abstracts away from): https://glossary.istqb.org/en_US/term/test-procedure-1
- [`bdd-step-library-curator`](../bdd-step-library-curator/SKILL.md) - the canonical-vocabulary skill in this plugin.
