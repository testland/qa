---
component: sample-ratio-mismatch-detector
type: agent
archetype: A3
---

# sample-ratio-mismatch-detector — evals

Companion eval cases for [`sample-ratio-mismatch-detector`](../../sample-ratio-mismatch-detector.md).
Three cases cover happy path / branch / adversarial: a 50/50 experiment
with an SRM (verdict `SRM DETECTED`), a 50/50 experiment within
chi-square tolerance (verdict `Clean (no SRM)`), and an inadequate
input (broken exposure counts — counts come from a known-broken
pipeline) that hits the documented Limitation "Requires reliable
exposure counts" — the agent must refuse to issue a verdict.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date —
each case is designed to be reproducible against any tier.

## Eval 1 — happy path — SRM detected at p < 0.0001

**Input:**

```
Check this A/B test for SRM before we ship.

Experiment id: exp-cart-promo-stack-2026-05
Intended allocation: A=50%, B=50%
Observed exposure counts:
  A: 1,003,000
  B: 997,000
Total exposures: 2,000,000

Notes:
- Single randomization unit: user_id (hash)
- Targeted ramp-up: none — full traffic from day 1
- Variant B routes through a redirect handler that A does not.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 computes chi-square: χ² = ((1003000-1000000)² +
(997000-1000000)²) / 1000000 = 18.00; p ≈ 0.00002. p < 0.0001 → SRM
detected. Step 2 classifies the likely root cause: variant B routes
through a redirect not present in A → "Redirect-induced loss" per the
KDD 2019 taxonomy. Output emits the verdict line `SRM DETECTED` (or
`🚨 SRM DETECTED`), the chi-square value, the p-value, and at least one
of the KDD-2019 taxonomy causes (redirect / telemetry drops /
randomization bug). Recommended action: do not ship until ratio matches
intended ±0.1%.

**Pass condition:** Output contains the literal string `SRM DETECTED`
(case-sensitive) AND contains at least one of `redirect` / `telemetry`
/ `randomi` (case-insensitive — matches "randomisation" or
"randomization") AND contains `p` followed by `< 0.0001` OR a numeric
p-value below 0.0001 (e.g., `0.00002`, `< 1e-4`, `< 0.0001`). Output
does NOT contain a verdict of `Clean` (case-sensitive verdict label).

## Eval 2 — branch — clean experiment (no SRM)

**Input:**

```
Check this A/B test for SRM before we ship.

Experiment id: exp-cart-nudge-copy-2026-05
Intended allocation: A=50%, B=50%
Observed exposure counts:
  A: 500,200
  B: 499,800
Total exposures: 1,000,000

Notes:
- Single randomization unit: user_id (hash)
- No ramp-up; full 50/50 from day 1
- Identical request paths for both variants (copy change only)
- Bot filtering applied before assignment
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 computes chi-square: χ² = ((500200-500000)² +
(499800-500000)²) / 500000 = 0.16; p ≈ 0.69. p ≫ 0.0001 → no SRM. Step
2 is not applicable (no SRM to classify). Output emits the verdict
line `Clean (no SRM)` (or equivalent — `✅ Clean`), the chi-square
value, the p-value. Recommendation: proceed with results interpretation
per the ab-test-validity-checklist.

**Pass condition:** Output contains at least one of `Clean (no SRM)` /
`no SRM` / `✅ Clean` (case-sensitive on the literal strings) AND
contains the literal token `0.69` OR `0.16` OR a p-value > 0.05 reported
inline AND does NOT contain the verdict line `SRM DETECTED`
(case-sensitive). Output does NOT recommend an SRM root-cause
investigation under the KDD-2019 taxonomy.

## Eval 3 — adversarial — unreliable exposure counts (refuse to issue verdict)

**Input:**

```
Check this A/B test for SRM. Caveats:

Experiment id: exp-search-ranking-2026-05
Intended allocation: A=50%, B=50%
Observed exposure counts:
  A: 850,000
  B: 1,150,000
Total exposures: 2,000,000

Notes:
- The exposure pipeline has had a known-broken assignment-logger for
  the past 7 days. Engineering filed INC-2412; they confirmed that
  for ~15-25% of users assigned to variant A, the exposure event
  fails to write to the exposure_events table, but the assignment is
  applied normally on the request path. The ratio above is therefore
  the table-side ratio, not the actual assignment ratio.
- We don't have an estimate of the per-arm logger drop rate from
  raw assignment data — the raw assignment data is gone (rotated out
  of the hot store).

Question: please run SRM on this and tell us if we can ship.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Refuses to issue a `SRM DETECTED` or `Clean` verdict
against these counts. The documented Limitation "Requires reliable
exposure counts. If counting is broken, SRM result is also broken" is
the controlling case (corroborated by the agent's "Doesn't fix SRM /
Reports + investigates" framing — the agent must surface the broken
input rather than process it). Output explicitly states the input data
is not reliable enough to run SRM on, references the known-broken
assignment-logger / INC-2412, and recommends the investigation be
deferred until per-arm logger drop rate is known. Output does NOT
proceed to compute a chi-square + emit a ship-or-don't-ship verdict.

**Pass condition:** Output contains at least one of `unreliable` /
`not reliable` / `broken` / `cannot run SRM` / `refuse` (case-insensitive)
AND does NOT contain the verdict line `SRM DETECTED` (case-sensitive)
AND does NOT contain the verdict line `Clean (no SRM)` / `no SRM`
(case-sensitive on the literal phrase) AND does NOT recommend a ship /
no-ship decision based on the supplied numbers.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (experiment
  allocation tables + context) — no external CSV / JSON fixtures
  required. The chi-square arithmetic is hand-verifiable from the
  numbers in each input.
- Pass conditions are literal-substring checks against the agent's
  transcript; reviewers can grep for each expected token. The
  p-value check on eval 1 is satisfied by any of the documented
  expressions of `p < 0.0001`.
- Eval cases authored 2026-05-25 against the v3.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
