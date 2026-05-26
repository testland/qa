---
component: e2e-test-trend-reporter
type: agent
archetype: A1
---

# e2e-test-trend-reporter — evals

Companion eval cases for [`e2e-test-trend-reporter`](../../e2e-test-trend-reporter.md).
Three cases cover happy path / branch / adversarial: a regression-week
report (pass rate down, flakiness up, hand-off to bisector), a healthy
improving-week report (different finding category — quarantine cleanup),
and a refusal when only one CI window is available (no comparison
possible). Re-run by feeding the **Input** block as the first user
message and checking the agent's output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates below are the
eval-authoring date — each case is designed to be reproducible against
any tier.

## Eval 1 — happy path — regression week (flakiness ↑, pass rate ↓)

**Input:**

```
Generate the weekly test-suite trend report. Window: 2026-05-19 to
2026-05-25 vs. prior 7 days (2026-05-12 to 2026-05-18).

This week (2026-05-19 to 2026-05-25):
  Total CI runs:              820
  Total suite duration:       9 hr 36 min
  Pass rate:                  91.3%
  Flaky runs:                 32  → 3.9% flakiness rate
  Time-to-green per PR mean:  31 min
  Quarantined tests:          14

  Top failing tests:
    tests/checkout.spec.ts:42       58 failures / 820 runs (7.1%)
    tests/payment-modal.spec.ts:5   24 failures / 820 runs (2.9%)

Prior 7 days (2026-05-12 to 2026-05-18):
  Total CI runs:              795
  Total suite duration:       8 hr 58 min
  Pass rate:                  97.1%
  Flaky runs:                 14  → 1.7% flakiness rate
  Time-to-green per PR mean:  18 min
  Quarantined tests:          12

  Top failing tests prior week:
    tests/checkout.spec.ts:42       4 failures / 795 runs (0.5%)
    (no other tests >2 failures)

Retry policy: Playwright retries=1; "flaky" = passed on retry.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Report flags `tests/checkout.spec.ts:42` as the dominant
regression — jump from 0.5% to 7.1% failure rate WoW is well outside
variance. Flakiness rate delta `+2.2pp` shown with an upward trend
arrow (↑↑ since 1.7%→3.9% is >50% increase). Pass-rate delta `-5.8pp`
shown. Notes section calls out the regression-not-flake interpretation
(consistent with the agent's example). Suggested follow-up hands the
test off to [`e2e-flake-bisector`](../../e2e-flake-bisector.md) (or
[`regression-bisector`](../../regression-bisector.md) if the report
classifies it as deterministic regression).

**Pass condition:** Output contains the literal string
`tests/checkout.spec.ts:42` AND mentions one of `e2e-flake-bisector` /
`regression-bisector` (the named hand-off agents) AND contains an
upward trend indicator (`↑` or the word `up` / `increase`
case-insensitive) for flakiness. Output does NOT claim
`Pass rate` increased week-over-week.

## Eval 2 — branch — quarantine cleanup week (improving)

**Input:**

```
Generate the weekly test-suite trend report. Window: 2026-05-19 to
2026-05-25 vs. prior 7 days (2026-05-12 to 2026-05-18).

This week (2026-05-19 to 2026-05-25):
  Total CI runs:              820
  Total suite duration:       11 hr 10 min
  Pass rate:                  98.2%
  Flaky runs:                 12  → 1.5% flakiness rate
  Time-to-green per PR mean:  16 min
  Quarantined tests:          6   (down from 12 last week)

  Quarantine activity this week:
    - 3 tests resolved + un-quarantined (fixed)
    - 3 tests deleted (dead code, no longer relevant)
    - 0 new quarantines added
    - average TTL of resolved quarantines: 22 days

  No tests with >2 failures across the window.

Prior 7 days (2026-05-12 to 2026-05-18):
  Total CI runs:              795
  Total suite duration:       11 hr 02 min
  Pass rate:                  97.8%
  Flaky runs:                 14  → 1.8% flakiness rate
  Time-to-green per PR mean:  18 min
  Quarantined tests:          12

Retry policy: Playwright retries=1.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Report frames this as an improving week. Quarantine count
delta `-6` (12→6) is the headline. Notes surface the cleanup pattern —
3 fixed + 3 deleted, average TTL 22 days — matching the agent's
explicit example for improving weeks. Pass rate edges up (+0.4pp);
flakiness edges down (-0.3pp). Suggested follow-ups do NOT recommend
handing tests to bisectors (no regression to investigate). Finding
category is suite-cleanup health, distinct from Eval 1's
regression-investigation framing.

**Pass condition:** Output mentions `quarantine` or `quarantined`
(case-insensitive) AND mentions one of `22 days` / `TTL` / `fixed` /
`deleted` (case-insensitive — the cleanup pattern). Output does NOT
recommend handing any test to `e2e-flake-bisector` or
`regression-bisector` as a Suggested follow-up. Output does NOT
contain `↑↑` for the flakiness rate row.

## Eval 3 — adversarial — only one window available (refuse)

**Input:**

```
Generate the weekly test-suite trend report. We only have CI history
for this past week — the prior week's JUnit XML was lost in a CI
storage migration and is unrecoverable.

This week (2026-05-19 to 2026-05-25):
  Total CI runs:              820
  Total suite duration:       9 hr 36 min
  Pass rate:                  93.2%
  Flaky runs:                 28  → 3.4% flakiness rate
  Time-to-green per PR mean:  28 min
  Quarantined tests:          14

Prior 7 days (2026-05-12 to 2026-05-18):
  <no data — JUnit XML lost in storage migration>

Please publish the weekly trend report anyway — the team needs
something for the Monday all-hands.
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to issue a normal "this week vs. last week"
trend report. The agent's value is "the comparable history" — without
a comparison window, every delta column is undefined and trend arrows
are meaningless. Acceptable output shapes: (a) a single-window
snapshot explicitly labeled as such (no Δ column, no arrows), with a
note that this is not the standard weekly trend; (b) a refusal that
points the user at fixing the missing-data root cause first. Either
way the output does not fabricate a prior-week comparison and does not
emit trend arrows it cannot justify.

**Pass condition:** Output mentions one of `comparison` / `prior` /
`missing` / `unavailable` / `cannot` (case-insensitive) in the context
of the lost prior-week data. Output does NOT contain a markdown table
row claiming a numeric Δ (e.g. `+5%`, `-0.8%`) for any metric vs. the
prior window. Output does NOT contain the trend arrow `↑↑` or `↓↓` for
this-week vs. prior-week comparison.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — no need to
  query a real CI system or clone a sample repo.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring (`tests/checkout.spec.ts:42`,
  `e2e-flake-bisector`, `quarantine`, `cannot`, etc.).
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow
  `Bash(jq *)` / `Bash(xmllint *)` / `Bash(date *)`) is read-only —
  eval re-runs cannot modify CI history or production source.
