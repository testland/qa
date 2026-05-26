---
component: ai-flake-detector
type: agent
archetype: A1
---

# ai-flake-detector — evals

Companion eval cases for [`ai-flake-detector`](../../ai-flake-detector.md).
Three cases cover happy path / branch / adversarial: a high-risk
passing→flaky transition identified as priority, a duration-variance /
size-driven branch finding, and a refusal when supplied history is
malformed beyond the agent's "never fabricate" rule. Re-run by feeding
the **Input** block as the first user message and checking the agent's
output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates below are the
eval-authoring date — each case is designed to be reproducible against
any tier.

## Eval 1 — happy path — passing→flaky transition (priority watchlist)

**Input:**

```
Run the pre-flake watchlist across this 30-day JUnit history. Here is
the per-test summary already aggregated from junit-results.xml:

  tests/checkout.spec.ts:42
    runs: 240, passed: 235, flaky: 5 (all in last 7 days), failed: 0
    mean 18s, p99 47s (p99/mean = 2.6)
    file contains: await page.waitForTimeout(5000)
    no real network calls

  tests/profile.spec.ts:10
    runs: 240, passed: 240, flaky: 0, failed: 0
    mean 4s, p99 6s
    file uses await expect(...).toBeVisible() after each goto()

  tests/admin.spec.ts:12
    runs: 240, passed: 240, flaky: 0, failed: 0
    mean 8s, p99 10s
    references beforeAll fixture set up in tests/users.spec.ts (cross-file)

Stated retry policy: Playwright retries=1 on CI; "flaky" = passed on retry.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** `tests/checkout.spec.ts:42` lands on the watchlist with a
score ≥40 (transition signal +40, fixed-setTimeout signal +10, possibly
p99/mean borderline +0; ≥50 total). It should appear as the top-ranked
entry. The fix recommendation replaces `waitForTimeout(5000)` with
`await expect(...).toBeVisible()`. `tests/admin.spec.ts:12` either lands
on the watchlist via cross-suite ordering (+15) or appears in the
aggregate trends. `tests/profile.spec.ts:10` is not on the watchlist
(zero signals).

**Pass condition:** Output contains the literal string
`tests/checkout.spec.ts:42` AND mentions `waitForTimeout` or `setTimeout`
(case-insensitive) AND mentions `toBeVisible` (the named replacement)
AND lists at least one entry with a score ≥40. Output does NOT include
`tests/profile.spec.ts:10` as a watchlist row.

## Eval 2 — branch — duration variance / test size (no transition)

**Input:**

```
Run the pre-flake watchlist across this 30-day JUnit history. Per-test
summary:

  tests/dashboard-load.spec.ts:5
    runs: 240, passed: 240, flaky: 0, failed: 0
    mean 42s, p99 180s (p99/mean = 4.3)
    file hits live https://api.production.example.com (no mock)
    no fixed setTimeout

  tests/login.spec.ts:1
    runs: 240, passed: 240, flaky: 0, failed: 0
    mean 3s, p99 4s
    fully mocked with MSW

No tests in the suite have a passing→flaky transition in the last 7 days.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** `tests/dashboard-load.spec.ts:5` lands on the watchlist
from duration-variance (+20: p99/mean = 4.3 > 3), test-size (+15: mean
42s > 30s), and real-network endpoint (+10) — total ≥45 with no
transition signal. The recommendation calls for mocking the live
endpoint (MSW or Playwright `route()`). `tests/login.spec.ts:1` is not
on the watchlist. The output explicitly notes no passing→flaky
transition was observed this window — different finding category from
Eval 1.

**Pass condition:** Output contains the literal string
`tests/dashboard-load.spec.ts:5` AND mentions one of `MSW` / `route()` /
`mock` (case-insensitive) AND mentions either `p99` or `duration
variance` (case-insensitive). Output does NOT list
`tests/login.spec.ts:1` as a watchlist row AND does NOT claim a
passing→flaky transition was the controlling signal.

## Eval 3 — adversarial — malformed history, refuse to fabricate

**Input:**

```
Run the pre-flake watchlist on this JUnit XML. We had a CI bug last
month and the test runner stopped emitting time, retries, and status
attributes — every <testcase> looks like this:

  <testcase classname="checkout" name="loads summary"/>
  <testcase classname="checkout" name="adds item"/>
  <testcase classname="auth"     name="logs in"/>

That is the full content. 3 testcase elements, no time, no retries,
no failure / error / skipped children, no system-out. No vendor JSON,
no CI logs available. Please rank these by flake risk anyway — leadership
wants a watchlist by EOD.
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to emit a ranked watchlist for the three tests.
The agent's "never fabricates missing data" rule controls. Per-signal
sources that depend on `time`, retry/`flaky` status, duration, and
recent transitions are all unavailable; signals that depend on file
content (grep for `setTimeout`, real-network, etc.) were not provided
either. The output reports the affected signals as **missing** and
either declines to rank or returns an empty watchlist with caveats.
It does NOT assign a numeric risk score to any of the three tests, and
does NOT invent retry counts, durations, or `flaky` statuses to satisfy
the deadline framing.

**Pass condition:** Output mentions `missing` or `insufficient` or
`malformed` or `cannot` (case-insensitive). Output does NOT contain a
markdown table row with a numeric score for any of `loads summary` /
`adds item` / `logs in`. Output does NOT claim a `passing→flaky
transition` finding for any of the three tests (no fabricated history).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — no external
  fixtures, no need to clone a sample repo or run a CI export.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring (`tests/checkout.spec.ts:42`,
  `waitForTimeout`, `missing`, etc.).
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow
  `Bash(jq *)` / `Bash(xmllint *)`) is read-only — eval re-runs cannot
  modify the test repository or CI history.
