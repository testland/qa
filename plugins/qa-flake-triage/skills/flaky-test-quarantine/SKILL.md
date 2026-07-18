---
name: flaky-test-quarantine
description: "Builds a quarantine workflow for flaky tests - marks the test with the framework's skip/fixme/retry annotation, records the failure-rate observation and a bisect link in the annotation body, sets an auto-expiry date, and produces a CI report listing every quarantined test that has expired and needs re-evaluation. Use when a flaky test is blocking the trunk and must be removed from the gating path without losing track of it."
---

# flaky-test-quarantine

## Overview

A "flaky test" is a test that produces inconsistent pass/fail results
across runs without an underlying code change ([google-flaky][gtb]).
Industry consensus from Google Testing Blog and similar
practitioner-engineering sources is that flaky tests should be
**isolated from the gating path** rather than left to mask real
regressions or be silently ignored ([google-flaky][gtb]).

[gtb]: https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html

> **Terminology note:** "flaky test" is a practitioner-emergent term
> popularized by the Google Testing Blog. ISTQB does not maintain a
> canonical entry for it. This skill cites industry-engineering
> sources, not ISTQB authority.

This skill defines a quarantine workflow with five required parts:

1. **Mark** the test with the framework's annotation.
2. **Annotate** with the failure rate, bisect link, and quarantine date.
3. **Auto-expiry** - every quarantine has a TTL.
4. **Re-evaluation report** - a CI step that lists expired quarantines.
5. **Pruning** - close the loop by either fixing or deleting.

## When to use

- A test is failing on the trunk between 1% and 50% of runs (above 50%
  it's not flaky, it's broken; under 1% the noise is acceptable for
  most projects).
- The team's incident process has been triggered more than once by the
  same test.
- A new feature merge is blocked by a known-flaky pre-existing test
  that's unrelated to the change.

If the test fails 100% of the time after a code change, it's a
regression - bisect to the introducing commit and fix, do not
quarantine.

## Step 1 - Mark the test

### Playwright

`test.fixme()` is the canonical Playwright primitive for "this test is
broken; do not run past this point" ([pw-test][pw-test]):

[pw-test]: https://playwright.dev/docs/api/class-test

```typescript
test('checkout flow flaky test', async ({ page }) => {
  test.fixme(
    true,
    'Quarantined 2026-05-04 (#1234) - fails ~12% of runs on tablet-768; bisect inconclusive. Re-evaluate by 2026-06-04.',
  );
  // ... test body, no longer runs
});
```

`test.fixme(condition, description)` skips with the description
visible in the report. Unlike `test.skip()`, `fixme` carries the
explicit "this needs to be fixed" intent ([pw-test][pw-test]).

If the goal is to allow retries before quarantining, use the
`retries` config first ([pw-retries][pw-retries]):

[pw-retries]: https://playwright.dev/docs/test-retries

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

A test that passes on retry is reported with the **`flaky`** status
(distinct from `passed` and `failed`); track these separately - 
flaky-but-passing tests are quarantine candidates, not yet
quarantined ([pw-retries][pw-retries]).

### Cypress

Cypress configures retries at the suite level via
`Cypress.config('retries', { runMode: 2, openMode: 0 })`. For
quarantining individual specs, use `it.skip(...)` or the
[`cypress-grep`](https://github.com/cypress-io/cypress-grep) plugin's
tagging convention.

### Jest / Vitest

`test.skip(...)` and `test.todo(...)` are the canonical primitives.
For periodic auto-evaluation, use `test.skip.if(condition)` patterns or
introduce a project-specific tagging convention parsed by your CI.

### JUnit / TestNG (JVM)

JUnit 5: `@Disabled("Quarantined 2026-05-04 (#1234) - ...")`.
TestNG: `@Test(enabled = false, description = "...")`.
For per-method retries before quarantine, JUnit 5's `@RetryingTest(N)`
extension and TestNG's `@Test(retryAnalyzer = ...)`.

## Step 2 - Annotate with failure rate + bisect link + expiry

The annotation body is the load-bearing part of the workflow. Every
quarantine record carries:

| Field             | Required | Format                                                |
|-------------------|----------|-------------------------------------------------------|
| Date              | yes      | `YYYY-MM-DD` of the quarantine.                       |
| Issue link        | yes      | `#1234` or full URL - links a tracked ticket.         |
| Failure rate      | yes      | `~12% of runs` - measured, not guessed.               |
| Bisect status     | yes      | `bisect inconclusive` / `bisected to commit abc1234` / `not yet bisected`. |
| Re-evaluate by    | yes      | `YYYY-MM-DD` - the auto-expiry date.                  |
| Owner             | optional | `@team-handle` for routing.                           |

The format is parseable by the re-evaluation report (Step 4):

```
Quarantined 2026-05-04 (#1234) - fails ~12% of runs on tablet-768;
bisect inconclusive. Re-evaluate by 2026-06-04. Owner: @web-platform.
```

## Step 3 - Auto-expiry

Default TTL: **30 days**. Picked because:

- Long enough to fix non-trivial issues without creating churn.
- Short enough that quarantined tests don't become a permanent
  graveyard.

Adjust per project:

- 90 days for low-traffic suites where the underlying issue is known
  but un-prioritized.
- 14 days for high-traffic CI where flakiness is an actively-monitored
  metric.

## Step 4 - Re-evaluation report

A nightly (or weekly) CI job greps all quarantine annotations,
extracts the `Re-evaluate by` date, and lists expired entries. A
minimal Bash version against a Playwright suite:

```bash
#!/usr/bin/env bash
# scripts/list-expired-quarantines.sh
set -e
TODAY=$(date -u +%Y-%m-%d)

grep -rn -B1 -A5 "test\.fixme(" tests/ \
  | awk '/Re-evaluate by/ { print FILENAME ":" $0 }' \
  | while IFS= read -r line; do
      EXPIRY=$(echo "$line" | grep -oE 'Re-evaluate by [0-9]{4}-[0-9]{2}-[0-9]{2}' | awk '{print $3}')
      if [[ "$EXPIRY" < "$TODAY" ]]; then
        echo "EXPIRED: $line"
      fi
    done
```

Run it as a scheduled GitHub Action and post the output to a Slack
channel or open a tracking issue per expired entry.

## Step 5 - Pruning rules

When a re-evaluation expires, the team has three options:

| Outcome                               | Action                                                       |
|---------------------------------------|--------------------------------------------------------------|
| Underlying issue fixed                | Remove `test.fixme()` and re-run; close the issue.           |
| Underlying issue still present        | Renew the quarantine for one more TTL with updated annotation; **never** more than two consecutive renewals - at that point, delete the test or rewrite it. |
| The test is no longer relevant        | Delete the test outright; close the issue.                   |

The two-renewal cap is the lever that prevents quarantine from
becoming a permanent dead-letter. Past two renewals, the team has
either lost interest in the assertion or the test is fundamentally
unfixable - both signal "delete."

## CI integration

```yaml
# .github/workflows/quarantine-report.yml
name: quarantine-report

on:
  schedule:
    - cron: '0 9 * * 1'   # Mondays 09:00 UTC
  workflow_dispatch:

jobs:
  list-expired:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: List expired quarantines
        run: bash scripts/list-expired-quarantines.sh > expired.txt

      - name: Open tracking issue per expired entry
        if: ${{ hashFiles('expired.txt') != '' }}
        run: |
          while IFS= read -r line; do
            gh issue create --title "Expired quarantine: ${line%%:*}" --body "$line"
          done < expired.txt
        env:
          GH_TOKEN: ${{ github.token }}
```

## References

- [google-flaky][gtb] - Google Testing Blog on flaky tests at scale;
  practitioner-emergent canonical reference for the term.
- [pw-test][pw-test] - Playwright `test.fixme()` / `test.skip()` /
  `test.fail()` API.
- [pw-retries][pw-retries] - Playwright retries config + `flaky`
  status reporting.
- [`flake-pattern-reference`](../flake-pattern-reference/SKILL.md) - 
  catalog of flake patterns to consult during bisect.
