---
name: test-run-summary-author
description: "Build-an-X workflow that takes a structured test-run artifact (JUnit XML, Allure JSON, TestRail / Xray / Zephyr API export) plus optional release context (version, build URL, deploy target) and emits a narrative markdown summary suitable for release notes, exec status updates, or stand-up Slack posts. Distinct from per-framework parsers (junit-xml-analysis / allure-reports / coverage-diff-reporter) which produce structured tabular reports - this skill takes the same data and produces the **narrative draft** practitioners use today by pasting raw results into ChatGPT. Distinct from longitudinal suite-health trend reporting, which reports suite health over time. Use when a manager needs a draft release note or a stand-up summary from a single test run."
---

# test-run-summary-author

## Overview

A test run produces structured data (pass / fail counts, duration, failures with stack traces, coverage). A status update needs *narrative* (one-paragraph summary, top-3 highlights, single-line status banner). Closing the gap is what 70% of practitioners already do with chat models per [PractiTest's 2026 State of Testing Report](https://www.practitest.com/state-of-testing/), but with two known failure modes: hallucinated numbers and inconsistent tone across runs. This skill constrains the output shape so the same input always produces the same structure, removing the variance.

The skill is the manager-layer equivalent of the structured-parser skills. Where `junit-xml-analysis` produces a parsed report, this skill produces the *prose draft* a manager edits before pasting into Slack / a release-notes PR / an exec-summary email.

## When to use

- A release is going out and the team needs draft release notes from the release-build's test results.
- A daily / weekly stand-up needs a one-paragraph "where are we" status from a recent CI run.
- A retro / QBR needs a per-release narrative summary across multiple runs over a time window.
- An exec asks "what's the QA state for v3.4.0?" and the manager needs a defensible, traceable answer drafted from real data.

Do **not** use this skill to:

- Produce a full tabular report - that is the job of `junit-xml-analysis`, `allure-reports`, or `coverage-diff-reporter`.
- Surface flake patterns over time - that is longitudinal suite-health trend reporting, not this skill.
- Roll up multiple suites across multiple environments in one report - that is a separate cross-suite roll-up, not this skill's single-run scope.

## How to use

1. Ingest one structured run artifact - JUnit XML, an Allure results directory, or a test-management API export (Ingest the run data).
2. Compute the six load-bearing numbers from the input; never invent a metric the input lacks (Compute the load-bearing numbers).
3. Pick an output shape (defaults to `status-update`) and fill its template from the computed numbers (Output shapes).
4. Verify every numeric claim against the source before emitting, and flag any claim you can't source rather than inventing it (Verify against the source).

## Ingest the run data

Accept one of three input shapes:

| Input | Format | Source |
|---|---|---|
| **JUnit XML** | One or more `*.xml` files conforming to the JUnit XML schema (testsuite + testcase + failure / error / skipped child elements) | CI runners, surefire, gradle, pytest --junitxml, jest-junit |
| **Allure results** | Directory of `*-result.json` + `*-container.json` per https://allurereport.org/docs/ - Allure organises results by test status (passed / failed / broken / skipped / unknown), categories, and severity levels | allure-pytest, allure-jest, allure-junit5, allure-cucumber, etc. |
| **Test-management API export** | TestRail run export, Xray run export, Zephyr cycle export | Test-management integration skills |

If multiple inputs are supplied, merge by run-id (or by test-name + start-time if no id) before summarisation. Conflicts in pass/fail status (same test reported as passing in one source and failing in another) are flagged in the output, not silently resolved.

## Compute the load-bearing numbers

Six metrics anchor every narrative. The skill computes them from the input and never invents:

| Metric | Definition | Why load-bearing |
|---|---|---|
| **Total / passed / failed / skipped** | Counts per status | The triage line |
| **Pass rate** | passed / (passed + failed); skipped excluded | The single-number health signal |
| **Duration** | wall-clock from earliest start to latest end | Tells the reader "is this a 5-minute smoke or a 2-hour regression" |
| **Top-N failures** | The N (default 3) longest-failing or most-recently-regressed tests | The actionable detail |
| **New failures vs. last run** | Tests that passed in the prior run and failed in this one | The "what changed" answer the exec wants |
| **Severity / category breakdown** | Per Allure's severity and categories taxonomy when available; otherwise omitted | Risk-weighted reading of the same numbers |

If the input lacks a metric (e.g., JUnit XML has no severity), the skill emits "n/a" rather than fabricating. Citation discipline matters most here - every number cited in the narrative is a number that appears in the input data.

## Output shapes

The skill emits one of four narrative shapes; the shape is an explicit parameter (defaults to `status-update`):

- **`status-update`** - Slack-ready, ≤3 lines: a pass/fail lead plus deltas and ownership (the Worked example below).
- **`release-notes`** - PR / changelog bullets: results, new failures vs the prior release, coverage, performance, known-issue waivers.
- **`exec-summary`** - one paragraph plus a 4-bullet outlook for the QBR / weekly leadership update.
- **`cross-run-trend`** - narrative over a window of runs (last N runs / days); requires ≥5 runs.

The full fill-in template for each shape is in [references/output-shapes.md](references/output-shapes.md).

## Worked example

A nightly regression, `status-update` shape, from two JUnit XML files (this run + the prior run):

- `junit/results-2026-05-09.xml`: 1,247 passed, 18 failed, 3 skipped -> pass rate 1247 / (1247 + 18) = 98.6%.
- `junit/results-2026-05-08.xml`: pass rate 98.9% -> delta -0.3pp.
- Duration: earliest testsuite start to latest stop = 1h 12m.
- Top-3 failures by impact: `cart.checkout.spec` (timeout), `auth.sso.spec` (assertion), `payments.refund.spec` (timeout).

The banner emoji maps pass rate to `:white_check_mark:` ≥99% / `:warning:` 95 - 98.99% / `:x:` <95%, so 98.6% is `:warning:`:

```markdown
**:warning: 2026-05-09 nightly regression - 1,247 pass, 18 fail, 3 skipped.**
Pass rate 98.6% (-0.3pp vs Thu). Top regressions: `cart.checkout.spec` (timeout), `auth.sso.spec` (assertion), `payments.refund.spec` (timeout). Run: <build-url>.
Duration 1h 12m; investigation owners: @cart, @auth, @payments.
```

Every number traces back to a source before the draft is emitted:

```markdown
### Audit (sources)

| Claim | Source |
|---|---|
| 1,247 / 18 / 3 | `junit/results-2026-05-09.xml` counts |
| 98.6% pass rate | computed passed / (passed + failed) |
| -0.3pp vs Thu | `junit/results-2026-05-08.xml` (98.9%) |
| Duration 1h 12m | earliest testsuite start to latest stop, same build |
```

## Verify against the source

Before emitting, walk each numeric claim in the draft and confirm it appears in the input data - the Worked example's audit table is the concrete form (suppressible via `--no-audit` once the numbers are trusted). If any claim cannot be sourced (e.g., the SLO baseline isn't in the input), flag `[unsourced - supply baseline]` rather than inventing it.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Inventing a trend ("regressions are up") with no prior-run data | Manager pastes the summary; exec asks "vs what?"; manager has no answer. | The Verify-against-source audit requires the prior-run source for any delta claim. |
| Citing severity when the input is JUnit XML (no severity field) | JUnit's testcase / failure schema does not carry severity. Severity from JUnit alone is fabrication. | Allure-only field; emit "n/a" for JUnit-only inputs. |
| Using pass-rate ≥99% as the default green threshold for a smoke suite | Smoke suites are tiny; one flake takes pass rate to ≤95%. | Threshold is configurable per suite kind (smoke / regression / e2e). |
| Picking top-3 failures by name only | Reader cannot tell why they matter. | Ranking is by failure-impact: longest-failing, most-recently-regressed, severity (when available). |
| Producing a `release-notes` shape with no link to the build / report | Reader cannot drill into the data; the narrative becomes load-bearing without source. | Build URL is required in the input; the skill refuses to emit a `release-notes` shape without it. |
| Drafting a `cross-run-trend` over 2 runs | Two data points are not a trend. | The `cross-run-trend` shape requires ≥5 runs (see references/output-shapes.md); otherwise emit `INSUFFICIENT_RUNS`: 2 runs supplied, 5+ required for a trend. |

## Limitations

- **Tone is templated.** The four shapes have fixed sentence patterns. Teams that want a more conversational style edit the output; the skill does not vary tone per audience.
- **Severity / categories require Allure or a test-management tool.** JUnit XML alone does not carry severity; the skill cannot infer it from naming patterns.
- **No flake-vs-defect classification.** A failure here is just "failed"; whether it is a flake, an environment-drift issue, or a real defect is the job of a separate failure-classification step. Compose the two when narrative + classification is needed.
- **No project-glossary substitution.** The skill emits `cart.checkout.spec` verbatim; if the team's exec audience prefers human-readable suite names, an upstream alias map is required (out of scope for this skill).
- **Coverage data is optional.** If the input does not include coverage, the `release-notes` shape omits the coverage bullet rather than fabricating numbers.

## Hand-off targets

- **Coverage delta detail** -> `coverage-diff-reporter`.
- **Per-tool tabular report** -> `junit-xml-analysis`, `allure-reports`.

## References

- Allure Report documentation - results format (`*-result.json`, `*-container.json`), status taxonomy (passed / failed / broken / skipped / unknown), severity, categories: https://allurereport.org/docs/
- JUnit XML schema reference - testsuite / testcase / failure / error / skipped element shape (the de facto interchange format used by surefire, jest-junit, pytest --junitxml): https://github.com/testmoapp/junitxml
- ISO/IEC/IEEE 29119-3:2021 - test reporting structures (cite by stable ID; the canonical ISO page sits behind Cloudflare Turnstile).
- ISTQB glossary - test report: https://glossary.istqb.org/en_US/term/test-report
- ISTQB glossary - quality gate (the release-readiness milestone the summary reports against): https://glossary.istqb.org/en_US/term/quality-gate
- PractiTest 2026 State of Testing Report - 70% use AI for test-case creation, "test factory" framing, narrative drafting as the dominant manager-layer use case: https://www.practitest.com/state-of-testing/
- [references/output-shapes.md](references/output-shapes.md) - the full fill-in template for all four output shapes (`status-update`, `release-notes`, `exec-summary`, `cross-run-trend`).
- `junit-xml-analysis`, `allure-reports`, `coverage-diff-reporter` - the per-tool parsers this skill consumes.
