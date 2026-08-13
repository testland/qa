# Scenario coverage map - fingerprint new Gherkin against the live suite

Deep reference for `bdd-step-library-curator` (the "scenario coverage map"
section). Consult before authoring tests for freshly generated `.feature`
files: it classifies each new scenario as already-covered, partially
covered, or a genuine gap.

Cucumber's Gherkin reference makes the step text - not the keyword - the
stable identity unit: "Keywords are not taken into account when looking for
a step definition. This means you cannot have a `Given`, `When`, `Then`,
`And` or `But` step with the same text as another step."
([cucumber.io/docs/gherkin/reference][gherkin-ref]) Fingerprint on the text.

This is a structural check on the step layer; it does not execute
assertions or report pass/fail - never a substitute for running the suite.

## Step 1 - Collect the new scenarios

Read each new `.feature` file (typically produced by
`gherkin-from-stories`). For each `Scenario` and `Scenario Outline`,
collect:

- The scenario title.
- The full ordered list of step texts, stripped of their keyword prefix
  (`Given`, `When`, `Then`, `And`, `But`) - keywords are cosmetic; the text
  is what step definitions match ([gherkin-ref][gherkin-ref]).
- Any `@tags` declared on the scenario or inherited from the `Feature`
  block ([cucumber.io/docs/cucumber/api][cucumber-api]).
- For `Scenario Outline`, note the parameter names from the `Examples:`
  table as placeholder tokens (e.g., `"<status>"`).

Output: a **new-scenario list** of `{ id, title, tags[], steps[] }` objects.

## Step 2 - Build the step-usage index from the existing suite

Glob all existing `.feature` files (excluding the new ones). Extract every
step text with the same keyword-strip rule; normalize whitespace and
lower-case. Build a **step-usage index**:
`normalized_step_text -> [{ feature_file, scenario_title, line_number }]`.

If the project produces Cucumber's `json` report
([cucumber.io/docs/cucumber/reporting][cucumber-reporting]), prefer loading
the report over re-parsing - it contains every executed step with its text,
status, and parent scenario, guaranteed to reflect the last run:

```bash
# Cucumber-JS
npx cucumber-js --format json:reports/cucumber.json

# JVM (Maven)
mvn test -Dcucumber.plugin="json:target/cucumber.json"
```

## Step 3 - Fingerprint and classify

A **scenario fingerprint** is the ordered tuple of its normalized step
texts.

| Status | Condition |
|---|---|
| `DUPLICATE` | All steps already present in the index under one existing scenario |
| `PARTIAL` | At least two steps overlap; one or more steps are new |
| `GAP` | Zero steps match any entry in the index |

## Step 4 - Resolve tag coverage

Tags on a new scenario may correspond to existing test runs (tag
expressions like `@smoke and @fast` / `not @wip` per
[cucumber-api][cucumber-api]). A `@smoke`-tagged `PARTIAL` scenario may
already be executed in a `@smoke` run; flag it explicitly as
`PARTIAL (tag match)`.

## Step 5 - Emit the coverage map

```markdown
## Coverage map for `<story-id>` (<date>)

**New scenarios evaluated:** N
**Exact duplicates:** A (skip these)
**Partial overlaps:** B (extend step definitions only)
**Genuine gaps:** C (author full scenarios)
**Step-usage index built from:** M existing .feature files / JSON report

### Duplicates (do not author - already covered)

| New Scenario | Existing Scenario | File |
|---|---|---|
| "User logs in with valid credentials" | "User submits correct password" | `auth/login.feature:14` |

### Partial overlaps (author only the new steps)

**Scenario: "Admin resets user password"**
- Already covered steps (3): step text A, step text B, step text C
- New steps required (1): "the user receives a password-reset email"
- Recommendation: add one new step definition; reuse the 3 covered steps.

### Gaps (author full scenario)

- "Password reset rate-limits after 5 attempts" (0 of 4 steps covered)
```

## Step 6 - Hard-reject conditions

Halt and report the blocker (a `BLOCKED` message naming the condition and
remediation) instead of emitting a map when:

- No existing `.feature` files and no Cucumber JSON report exist - a map
  against an empty suite is vacuous (everything is `GAP`).
- The new `.feature` files contain unparseable Gherkin (missing `Feature:`
  keyword, unclosed `Examples:` table, illegal step keyword) - fix the
  syntax first.
- The step-usage index has fewer than 5 distinct step texts - a suite that
  small has no coverage baseline; the map would mislead.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Stripping keywords but not normalizing whitespace | "Given the user is logged in" and "Given  the user…" fingerprint differently; false GAPs | Collapse whitespace and trim before comparing |
| Treating `Scenario Outline` rows as separate scenarios | Each Examples row shares the same step template | Fingerprint the template (placeholder tokens), not expanded rows |
| Ignoring the JSON report when one exists | Source files may include scenarios never run | Prefer the report; flag when only source parsing was possible |
| Counting `Background` steps toward `DUPLICATE` | Background steps are shared context, not scenario identity | Exclude Background steps from fingerprint comparison |

## Worked example

New `password-reset.feature` has three scenarios. The index (built from
`auth/login.feature` + `auth/session.feature`) shows: scenario 1's 4 steps
all present at `auth/login.feature:32` → `DUPLICATE` (do not author);
scenario 3 shares 2 of 5 steps with `auth/session.feature:18` → `PARTIAL`
(author 3 new step definitions, reuse 2); scenario 2 matches nothing →
`GAP` (author in full).

[gherkin-ref]: https://cucumber.io/docs/gherkin/reference
[cucumber-api]: https://cucumber.io/docs/cucumber/api/
[cucumber-reporting]: https://cucumber.io/docs/cucumber/reporting/
