---
name: test-run-summary-author
description: "Build-an-X workflow that takes a structured test-run artifact (JUnit XML, Allure JSON, TestRail / Xray / Zephyr API export) plus optional release context (version, build URL, deploy target) and emits a narrative markdown summary suitable for release notes, exec status updates, or stand-up Slack posts. Distinct from the per-framework parsers in `qa-test-reporting` (junit-xml-analysis / allure-reports / coverage-diff-reporter) which produce structured tabular reports - this skill takes the same data and produces the **narrative draft** practitioners use today by pasting raw results into ChatGPT. Distinct from `e2e-test-trend-reporter` (qa-flake-triage) which reports longitudinal suite health. Use when a manager needs a draft release note or a stand-up summary from a single test run."
rating: 23
d6: 4
---

# test-run-summary-author

## Overview

A test run produces structured data (pass / fail counts, duration, failures with stack traces, coverage). A status update needs *narrative* (one-paragraph summary, top-3 highlights, single-line status banner). Closing the gap is what 70% of practitioners already do with chat models per [PractiTest's 2026 State of Testing Report](https://www.practitest.com/state-of-testing/), but with two known failure modes: hallucinated numbers and inconsistent tone across runs. This skill constrains the output shape so the same input always produces the same structure, removing the variance.

The skill is the manager-layer equivalent of the structured-parser skills already in this plugin. Where `junit-xml-analysis` produces a parsed report, this skill produces the *prose draft* a manager edits before pasting into Slack / a release-notes PR / an exec-summary email.

## When to use

- A release is going out and the team needs draft release notes from the release-build's test results.
- A daily / weekly stand-up needs a one-paragraph "where are we" status from a recent CI run.
- A retro / QBR needs a per-release narrative summary across multiple runs over a time window.
- An exec asks "what's the QA state for v3.4.0?" and the manager needs a defensible, traceable answer drafted from real data.

Do **not** use this skill to:

- Produce a full tabular report - that is the job of [`junit-xml-analysis`](../junit-xml-analysis/SKILL.md), [`allure-reports`](../allure-reports/SKILL.md), or [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md).
- Surface flake patterns over time - that is [`e2e-test-trend-reporter`](../../../qa-flake-triage/agents/e2e-test-trend-reporter.md).
- Roll up multiple suites across multiple environments in one report - that is [`daily-test-suite-aggregator`](../../agents/daily-test-suite-aggregator.md), the sister agent in this plugin.

## Step 1 - Ingest the structured run data

Accept one of three input shapes:

| Input | Format | Source |
|---|---|---|
| **JUnit XML** | One or more `*.xml` files conforming to the JUnit XML schema (testsuite + testcase + failure / error / skipped child elements) | CI runners, surefire, gradle, pytest --junitxml, jest-junit |
| **Allure results** | Directory of `*-result.json` + `*-container.json` per https://allurereport.org/docs/ - Allure organises results by test status (passed / failed / broken / skipped / unknown), categories, and severity levels | allure-pytest, allure-jest, allure-junit5, allure-cucumber, etc. |
| **Test-management API export** | TestRail run export, Xray run export, Zephyr cycle export | The integration skills in this plugin |

If multiple inputs are supplied, merge by run-id (or by test-name + start-time if no id) before summarisation. Conflicts in pass/fail status (same test reported as passing in one source and failing in another) are flagged in the output, not silently resolved.

## Step 2 - Compute the load-bearing numbers

Six metrics anchor every narrative. The skill computes them from the input and never invents:

| Metric | Definition | Why load-bearing |
|---|---|---|
| **Total / passed / failed / skipped** | Counts per status | The triage line |
| **Pass rate** | passed / (passed + failed); skipped excluded | The single-number health signal |
| **Duration** | wall-clock from earliest start to latest end | Tells the reader "is this a 5-minute smoke or a 2-hour regression" |
| **Top-N failures** | The N (default 3) longest-failing or most-recently-regressed tests | The actionable detail |
| **New failures vs. last run** | Tests that passed in the prior run and failed in this one | The "what changed" answer the exec wants |
| **Severity / category breakdown** | Per Allure's severity and categories taxonomy when available; otherwise omitted | Risk-weighted reading of the same numbers |

If the input lacks a metric (e.g., JUnit XML has no severity), the skill emits "n/a" rather than fabricating. The d6 discipline matters most here - every number cited in the narrative is a number that appears in the input data.

## Step 3 - Pick the output shape

The skill emits one of four narrative shapes. The shape is an explicit input parameter (defaults to `status-update`):

### 3.1 - `status-update` (Slack-ready, ≤3 lines)

```markdown
**:white_check_mark: 2026-05-09 nightly regression — 1,247 pass, 18 fail, 3 skipped.**
Pass rate 98.6% (-0.3pp vs Wed). Top regressions: `cart.checkout.spec` (timeout), `auth.sso.spec` (assertion), `payments.refund.spec` (timeout). Run: <build-url>.
Duration 1h 12m, +4 min vs Wed; investigation owners: @cart, @auth, @payments.
```

The single-line lead is the load-bearing claim; the second and third lines are deltas + ownership. `:white_check_mark:` / `:warning:` / `:x:` map to pass-rate ≥99% / 95 - 98.99% / <95% by default (configurable per project).

### 3.2 - `release-notes` (PR / changelog form)

```markdown
## QA — v3.4.0

- **Test results:** 1,247 / 1,268 tests passed (98.3%), 18 failures, 3 skipped. Full report: <build-url>.
- **New failures vs v3.3.0:** 5 (3 in cart, 2 in auth). All 5 have open issues filed; severity classified per Allure. None are blocking per the team's [release-readiness gates](../../../qa-process/agents/release-readiness-checker.md).
- **Coverage:** 87.4% line, 78.1% branch (+0.6 / +0.4 vs v3.3.0). See [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md) for per-file delta.
- **Performance:** smoke + regression duration 1h 12m, no SLO regressions.
- **Known issues being shipped:** 3 P3 cosmetic flakes (tracked in [JIRA-1234, JIRA-1235, JIRA-1236]), waivers attached.
```

### 3.3 - `exec-summary` (one-paragraph + bullets)

For the QBR / weekly leadership update. Three sentences plus a 4-bullet outlook:

```markdown
The v3.4.0 release went through nightly regression with a 98.3% pass rate, marginally down from v3.3.0's 98.6% — driven by five new failures concentrated in cart and auth, all with open issues and assigned owners. Coverage improved (+0.6 line, +0.4 branch) and the smoke / regression duration stayed inside the 90-minute SLO. The release-readiness gate cleared with the standard 3 cosmetic-flake waivers.

- **What we ship:** v3.4.0 cleared all blocking gates.
- **What we watch:** auth.sso flakes — 2 of 5 failures share root cause; bisector running.
- **What we'd flag:** cart.checkout timeout — newly regressed since v3.3.0, possible perf change in the inventory-cache path.
- **What we'd ask of leadership:** confirm the 90-minute regression SLO is still the right ceiling; current trend is +4 minutes per release.
```

### 3.4 - `cross-run-trend` (multi-run window, narrative)

A narrative form covering a time window (last N runs, last N days). The skill computes per-run metrics, identifies the run-over-run direction, and writes the trend in prose. This is the manager-layer complement to the tabular [`e2e-test-trend-reporter`](../../../qa-flake-triage/agents/e2e-test-trend-reporter.md) - the trend reporter answers "what is the suite health"; this shape answers "tell me the story over the last sprint."

## Step 4 - Verify the narrative against the source

Before emitting the output, the skill walks each numeric claim in the draft and confirms it exists in the input data. The walk produces a small audit appendix (suppressible via `--no-audit`):

```markdown
### Audit (sources)

| Claim | Source |
|---|---|
| 1,247 / 1,268 tests | `junit/results-2026-05-09.xml` line counts |
| 98.3% pass rate | computed from above |
| -0.3pp vs Wed | `junit/results-2026-05-08.xml` (98.6%) |
| Top regressions | Allure category filter (`status:failed`, sorted by `start` desc) |
| 87.4% line / 78.1% branch | `coverage/coverage-summary.json` from same build |
| Smoke / regression 1h 12m | `start` of earliest testsuite to `stop` of latest in the same build |
```

If any claim cannot be sourced (e.g., the SLO baseline isn't in the input), the skill flags `[unsourced — supply baseline]` rather than inventing.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Inventing a trend ("regressions are up") with no prior-run data | Manager pastes the summary; exec asks "vs what?"; manager has no answer. | Step 4 audit requires the prior-run source for any delta claim. |
| Citing severity when the input is JUnit XML (no severity field) | JUnit's testcase / failure schema does not carry severity. Severity from JUnit alone is fabrication. | Allure-only field; emit "n/a" for JUnit-only inputs. |
| Using pass-rate ≥99% as the default green threshold for a smoke suite | Smoke suites are tiny; one flake takes pass rate to ≤95%. | Threshold is configurable per suite kind (smoke / regression / e2e). |
| Picking top-3 failures by name only | Reader cannot tell why they matter. | Ranking is by failure-impact: longest-failing, most-recently-regressed, severity (when available). |
| Producing a `release-notes` shape with no link to the build / report | Reader cannot drill into the data; the narrative becomes load-bearing without source. | Build URL is required in the input; the skill refuses to emit a `release-notes` shape without it. |
| Drafting a cross-run-trend over 2 runs | Two data points are not a trend. | Step 3.4 requires ≥5 runs; otherwise emit `INSUFFICIENT_RUNS`: 2 runs supplied, 5+ required for a trend. |

## Limitations

- **Tone is templated.** The four shapes have fixed sentence patterns. Teams that want a more conversational style edit the output; the skill does not vary tone per audience.
- **Severity / categories require Allure or a test-management tool.** JUnit XML alone does not carry severity; the skill cannot infer it from naming patterns.
- **No flake-vs-defect classification.** A failure here is just "failed"; whether it is a flake, an environment-drift issue, or a real defect is the job of [`failure-classifier`](../../../qa-bug-repro/agents/failure-classifier.md). Compose the two when narrative + classification is needed.
- **No project-glossary substitution.** The skill emits `cart.checkout.spec` verbatim; if the team's exec audience prefers human-readable suite names, an upstream alias map is required (out of scope for this skill).
- **Coverage data is optional.** If the input does not include coverage, the `release-notes` shape omits the coverage bullet rather than fabricating numbers.

## Hand-off targets

- **Cross-suite cross-environment daily roll-up** → [`daily-test-suite-aggregator`](../../agents/daily-test-suite-aggregator.md) (sister agent in this plugin).
- **Per-test failure classification** → [`failure-classifier`](../../../qa-bug-repro/agents/failure-classifier.md).
- **Defect trend narrative over a longer window** → [`defect-trend-narrator`](../../../qa-bug-repro/agents/defect-trend-narrator.md).
- **Coverage delta detail** → [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md).
- **Per-tool tabular report** → [`junit-xml-analysis`](../junit-xml-analysis/SKILL.md), [`allure-reports`](../allure-reports/SKILL.md).

## References

- Allure Report documentation - results format (`*-result.json`, `*-container.json`), status taxonomy (passed / failed / broken / skipped / unknown), severity, categories: https://allurereport.org/docs/
- JUnit XML schema reference - testsuite / testcase / failure / error / skipped element shape (the de facto interchange format used by surefire, jest-junit, pytest --junitxml): https://github.com/testmoapp/junitxml
- ISO/IEC/IEEE 29119-3:2021 - test reporting structures (cite by stable ID; the canonical ISO page sits behind Cloudflare Turnstile).
- ISTQB glossary - test report: https://glossary.istqb.org/en_US/term/test-report
- ISTQB glossary - release readiness: https://glossary.istqb.org/en_US/term/release
- PractiTest 2026 State of Testing Report - 70% use AI for test-case creation, "test factory" framing, narrative drafting as the dominant manager-layer use case: https://www.practitest.com/state-of-testing/
- [`junit-xml-analysis`](../junit-xml-analysis/SKILL.md), [`allure-reports`](../allure-reports/SKILL.md), [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md) - the per-tool parsers this skill consumes.
