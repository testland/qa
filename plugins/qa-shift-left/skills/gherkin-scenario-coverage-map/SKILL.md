---
name: gherkin-scenario-coverage-map
description: "Parses new Gherkin scenarios produced by acceptance-criteria-extractor, fingerprints each scenario by its Given/When/Then step sequence, diffs the fingerprints against existing step-definition usage in the live suite, and emits a coverage/duplicate map showing which new scenarios are already covered, which overlap partially, and which are genuine gaps. Use when acceptance criteria have been converted to .feature files and before any new automated tests are authored."
metadata:
  keywords: "bdd, gherkin, cucumber, coverage, duplicate-detection, shift-left"
---

# gherkin-scenario-coverage-map

## Overview

After `acceptance-criteria-extractor` turns a story into `.feature` files,
the natural next question is: do any of these scenarios already exist?
Authoring a test that a step definition already covers wastes effort and
inflates the suite. This skill closes that gap by mapping new Gherkin
scenarios to existing step-definition coverage before a single new test file
is created.

The canonical deduplication rule from Cucumber's Gherkin reference is:
"Keywords are not taken into account when looking for a step definition.
This means you cannot have a `Given`, `When`, `Then`, `And` or `But` step
with the same text as another step."
([cucumber.io/docs/gherkin/reference][gherkin-ref])
That rule makes the step text (not the keyword) the stable identity unit
for fingerprinting.

## When to use

- A story has been processed by
  `acceptance-criteria-extractor`
  and one or more `.feature` files exist in a working branch.
- The team is about to write new step definitions or wire up existing ones.
- A sprint review finds test counts rising faster than feature count, and
  the team suspects duplicate coverage.

Do not use this skill as a substitute for running the suite. It detects
structural duplicates and coverage gaps in the step layer; it does not
execute assertions or report pass/fail.

## Step 1 - Collect the new scenarios

Read every `.feature` file produced by `acceptance-criteria-extractor` (or
identified by the user). For each `Scenario` and `Scenario Outline`, collect:

- The scenario title.
- The full ordered list of step texts, stripped of their keyword prefix
  (`Given`, `When`, `Then`, `And`, `But`). Per
  [gherkin-ref][gherkin-ref], keywords are cosmetic; the text is what
  step definitions match.
- Any `@tags` declared on the scenario or inherited from the `Feature` block.
  Tags use the `@name` prefix syntax and are space-separated on the line
  above the keyword ([cucumber.io/docs/cucumber/api][cucumber-api]).
- For `Scenario Outline`, note the parameter names from the `Examples:` table
  as a suffix to each step text placeholder (e.g., `"<status>"`).

Output: a **new-scenario list** of `{ id, title, tags[], steps[] }` objects.

## Step 2 - Build the step-usage index from the existing suite

Glob all `.feature` files in the existing suite (excluding the new ones from
Step 1). For each file, extract every step text using the same keyword-strip
rule as Step 1. Normalize whitespace and lower-case each text.

Build a **step-usage index**: a map of `normalized_step_text ->
[{ feature_file, scenario_title, line_number }]`.

If the project uses Cucumber's `json` report format
([cucumber.io/docs/cucumber/reporting][cucumber-reporting]: built-in plugins
include `json`, `html`, `junit`, `message`), prefer loading the report over
re-parsing `.feature` files. The JSON report contains every executed step
with its text, status, and parent scenario, making the index cheaper to build
and guaranteed to reflect the last run.

To generate a fresh JSON report (Cucumber-JS example):

```bash
npx cucumber-js --format json:reports/cucumber.json
```

For JVM (Maven):

```bash
mvn test -Dcucumber.plugin="json:target/cucumber.json"
```

## Step 3 - Fingerprint each new scenario

For each new scenario from Step 1, compute a **scenario fingerprint**: the
ordered tuple of its normalized step texts. Two scenarios are
**exact duplicates** when their fingerprints are identical.

Two scenarios are **partial overlaps** when their step sets share a
strict subset (at least two steps in common but not all).

A scenario is a **genuine gap** when none of its steps appear in the
step-usage index.

Assign each new scenario one of three coverage statuses:

| Status | Condition |
|---|---|
| `DUPLICATE` | All steps already present in the index under one existing scenario |
| `PARTIAL` | At least two steps overlap; one or more steps are new |
| `GAP` | Zero steps match any entry in the index |

## Step 4 - Resolve tag coverage

Tags declared on a new scenario may correspond to existing test runs. Per
[cucumber-api][cucumber-api], tag filtering uses boolean expressions such as
`@smoke and @fast` or `not @wip`. Check the step-usage index entries for
matching tags. A scenario tagged `@smoke` that maps to a `PARTIAL` overlap
may already be executed as part of a `@smoke` run; flag this explicitly in
the output as a `PARTIAL (tag match)` variant.

## Step 5 - Emit the coverage map

Produce a structured report with three sections.

### Section A - Exact duplicates

List each `DUPLICATE` scenario with the existing scenario it mirrors:

```markdown
### Duplicates (do not author - already covered)

| New Scenario | Existing Scenario | File |
|---|---|---|
| "User logs in with valid credentials" | "User submits correct password" | `auth/login.feature:14` |
```

### Section B - Partial overlaps

For each `PARTIAL` scenario, list the new steps (steps not yet in the index)
and the existing steps (already covered):

```markdown
### Partial overlaps (author only the new steps)

**Scenario: "Admin resets user password"**
- Already covered steps (3): step text A, step text B, step text C
- New steps required (1): "the user receives a password-reset email"
- Recommendation: add one new step definition; reuse existing definitions
  for the 3 covered steps.
```

### Section C - Genuine gaps

List each `GAP` scenario in full, marked ready for new test authoring:

```markdown
### Gaps (author full scenario)

- "Password reset rate-limits after 5 attempts" (0 of 4 steps covered)
- "SSO login redirects to IdP" (0 of 3 steps covered)
```

### Summary header

```markdown
## Coverage map for `<story-id>` (<date>)

**New scenarios evaluated:** N
**Exact duplicates:** A (skip these)
**Partial overlaps:** B (extend step definitions only)
**Genuine gaps:** C (author full scenarios)
**Step-usage index built from:** M existing .feature files / JSON report
```

## Step 6 - Hard-reject conditions

Do not emit a coverage map if any of the following conditions hold. Halt
and report the blocker instead:

- No existing `.feature` files and no Cucumber JSON report are found.
  A coverage map against an empty suite is vacuous; all new scenarios
  would be `GAP` by definition and the map adds no signal.
- The new `.feature` files contain unparseable Gherkin (missing `Feature:`
  keyword, unclosed `Examples:` table, illegal step keyword). Fix the
  syntax first; use `acceptance-criteria-extractor` to regenerate if needed.
- The step-usage index contains fewer than 5 distinct step texts. A suite
  this small has not yet established coverage baselines; the map would
  mislead rather than inform.

Emit a `BLOCKED` message that names the condition and the remediation step.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Stripping keywords but not normalizing whitespace | "Given the user is logged in" and "Given  the user is logged in" produce different fingerprints; false GAPs. | Collapse consecutive whitespace and trim before comparing. |
| Treating `Scenario Outline` rows as separate scenarios | Each Examples row shares the same step template; deduplicate at the template level, not at the instantiated level. | Fingerprint the template (with placeholder tokens), not the expanded rows. |
| Building the index from source `.feature` files but ignoring the JSON report | JSON report reflects executed steps; source files may include scenarios never run. | Prefer the JSON report when available; flag when only source parsing was possible. |
| Flagging a `PARTIAL` as `DUPLICATE` when the shared steps are only `Background` steps | Background steps are shared context, not scenario identity. | Exclude Background steps from fingerprint comparison. |

## Worked example

**Input:** `acceptance-criteria-extractor` produced `password-reset.feature`
with three scenarios:

1. "User requests password reset" (4 steps)
2. "Reset link expires after 24 hours" (3 steps)
3. "User resets password with valid token" (5 steps)

**Existing suite index (from `auth/login.feature` and `auth/session.feature`):**
Steps 1-4 from scenario 1 are all present in `auth/login.feature:32`.
Steps 1-2 from scenario 3 are in `auth/session.feature:18`; steps 3-5 are new.
Scenario 2 has no matching steps.

**Coverage map output:**

```markdown
## Coverage map for `AUTH-42` - 2026-06-04

**New scenarios evaluated:** 3
**Exact duplicates:** 1 (skip these)
**Partial overlaps:** 1 (extend step definitions only)
**Genuine gaps:** 1 (author full scenarios)
**Step-usage index built from:** 2 existing .feature files

### Duplicates (do not author)
| New Scenario | Existing Scenario | File |
|---|---|---|
| "User requests password reset" | "User initiates reset flow" | `auth/login.feature:32` |

### Partial overlaps
**Scenario: "User resets password with valid token"**
- Already covered (2): "the user has a valid reset token", "the user navigates to /reset"
- New steps required (3): "they enter a new password", "they confirm the password", "a success banner appears"
- Recommendation: add 3 step definitions; reuse 2 existing.

### Gaps (author full scenario)
- "Reset link expires after 24 hours" - 0 of 3 steps covered
```

## References

- [gherkin-ref][gherkin-ref] - Cucumber Gherkin reference: step keywords,
  step text identity rule ("keywords are not taken into account when looking
  for a step definition"), Feature / Background / Scenario / Scenario Outline.
- [cucumber-api][cucumber-api] - Cucumber API reference: tag syntax (`@name`,
  space-separated), tag expressions (`and`, `or`, `not`), tag inheritance from
  Feature to Scenario, CLI filtering via `--tags` and
  `cucumber.filter.tags` property.
- [cucumber-reporting][cucumber-reporting] - Cucumber reporting reference:
  built-in reporter plugins (`json`, `html`, `junit`, `message`, `progress`,
  `rerun`); JSON report as the canonical executed-step record.
- `acceptance-criteria-extractor` -
  upstream skill that produces the `.feature` files this skill consumes.
- `non-functional-requirement-extractor` - sibling for non-functional
  requirements; scenarios it produces are out of scope for BDD-suite coverage
  mapping.

[gherkin-ref]: https://cucumber.io/docs/gherkin/reference
[cucumber-api]: https://cucumber.io/docs/cucumber/api/
[cucumber-reporting]: https://cucumber.io/docs/cucumber/reporting/
