---
component: risk-matrix-recommender
type: agent
archetype: A3
---

# risk-matrix-recommender — evals

Companion eval cases for [`risk-matrix-recommender`](../../risk-matrix-recommender.md).
Three cases cover happy path / branch / adversarial: an under-stated row
producing a "recommend raise" divergence with cited evidence, a
candidate-new-entry detection for a feature absent from the matrix, and
a thin-history input that triggers the `INSUFFICIENT_HISTORY` refuse
halt.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates recorded below are
the eval-authoring date — each case is designed to be reproducible
against any tier.

## Eval 1 — happy path — under-stated row, recommend raise

**Input:**

```
Calibrate this risk matrix against the last quarter of defect + CI data.

Window: 2026-02-01..2026-04-30 (90 days, 6 releases shipped: v1.3.0,
v1.3.1, v1.3.2, v1.4.0, v1.4.1, v1.4.2).

Risk matrix (current, per the `risk-matrix` skill format):

| Feature              | Category | Impact | Likelihood | Score |
|----------------------|----------|--------|------------|-------|
| inventory-cache      | tech     |   3    |     2      |   6   |
| payments-checkout    | tech     |   5    |     3      |  15   |
| onboarding-emails    | tech     |   3    |     2      |   6   |
| admin-rbac           | sec      |   5    |     2      |  10   |

Tracker export (tracker-export.json, filtered to window):
  inventory-cache:   13 defects (4 found_in=production, 6 P1+P2, 7 P3)
  payments-checkout:  2 defects (0 found_in=production, 1 P2, 1 P3)
  onboarding-emails:  1 defect  (0 found_in=production, 1 P3)
  admin-rbac:         0 defects

CI results (ci-results-2026-Q2.json):
  Tests covering services/inventory/cache/: pass rate dropped 99% → 94%
    over the window (6% failure rate).
  Tests covering services/payments/checkout/: stable at 99.5%.
  Tests covering services/onboarding/email/: stable at 99.8%.
  Tests covering services/admin/rbac/: stable at 99.9%.

git log (window):
  services/inventory/cache/: 47 commits, churn 1820 LOC
  services/payments/checkout/: 8 commits, churn 210 LOC
  services/onboarding/email/: 3 commits, churn 90 LOC
  services/admin/rbac/: 1 commit, churn 12 LOC

Per the `risk-matrix` skill thresholds:
  likelihood-2 = "≤2 defects per quarter for the feature's source paths"
  likelihood-4 = "10-15 defects per quarter"
  impact-3 = "P1+P2 ≤ 20% of defects"
  impact-4 = "P1+P2 ≥ 40% of defects OR escape rate ≥ 25%"

Emit the calibration report.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 maps each matrix row to observed signals. Step 2.2
finds `inventory-cache`: matrix likelihood=2 vs observed=4 (13 defects
>10), matrix impact=3 vs observed=4 (6/13 = 46% P1+P2, 4/13 = 31%
escape rate). Score 6 → recommended 16, divergence 10 (well above the
≥4 cumulative threshold). Step 3 emits the recommendation `recommend
raise: 2×3 → 4×4, score 6 → 16` with the citation table — each
dimension cites the source data (`tracker-export.json:filter(...)`,
`ci-results-2026-Q2.json`, `git log services/inventory/cache/`). The
"What this agent did NOT do" section affirms the matrix is not
modified.

**Pass condition:** Output contains the literal string `inventory-cache`
AND the literal string `recommend raise` (or `under-stated`) AND
references `tracker-export.json` or `git log` as the cited data source.
Output does NOT contain a claim that the matrix file was edited (no
`modified the matrix`, no `wrote risk-matrix.md`).

## Eval 2 — branch — candidate new entry (feature not in matrix)

**Input:**

```
Calibrate this matrix against the last quarter.

Window: 2026-02-01..2026-04-30 (90 days, 4 releases shipped).

Risk matrix (current):

| Feature              | Category | Impact | Likelihood | Score |
|----------------------|----------|--------|------------|-------|
| payments-checkout    | tech     |   5    |     3      |  15   |
| admin-rbac           | sec      |   5    |     2      |  10   |
| onboarding-emails    | tech     |   3    |     2      |   6   |

Tracker export (window):
  payments-checkout:   2 defects (stable)
  admin-rbac:          0 defects
  onboarding-emails:   1 defect
  notifications-webhook-retry:  8 defects (2 found_in=production, 3 P1,
                                            2 P2, 3 P3)   <-- NOT in matrix
  search-relevance:    1 defect (1 P3)                    <-- NOT in matrix

CI results:
  Tests covering services/notifications/webhook/: pass rate 96%
    (3 flaky retries identified).
  Tests covering services/search/relevance/: pass rate 99.5%.

git log (window):
  services/notifications/webhook/: 23 commits, churn 540 LOC
  services/search/relevance/:        4 commits, churn 80 LOC

Per the `risk-matrix` skill thresholds:
  likelihood-3 = "3-9 defects per quarter"
  impact-4 = "P1+P2 ≥ 40% of defects OR escape rate ≥ 25%"

Emit the calibration report.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2.3 detects that `notifications-webhook-retry`
appears prominently in the defect tracker (8 defects, 2 production
escapes, 5 of 8 = 62% P1+P2) but is absent from the matrix. The agent
emits a "Candidate new matrix entries" block per Step 3, citing each
signal value with its source query. `search-relevance` either does NOT
appear as a candidate (1 defect is below the surfacing threshold) or
appears with explicit low-signal caveat. The "What this agent did NOT
do" section explicitly notes the candidate is NOT auto-added per the
Refuse-to-proceed rule.

**Pass condition:** Output contains the literal string
`notifications-webhook-retry` AND the literal substring
`candidate new` (or `Candidate new`) (the named section for un-matrixed
features). Output does NOT claim the feature was added to the matrix
(no `added to matrix`, no `inserted row`).

## Eval 3 — adversarial — insufficient history (refuse, INSUFFICIENT_HISTORY)

**Input:**

```
Calibrate our risk matrix. We just shipped v1.0.0 last week so we only
have 7 days of post-release defect data and one release shipped.

Risk matrix:

| Feature              | Category | Impact | Likelihood | Score |
|----------------------|----------|--------|------------|-------|
| payments-checkout    | tech     |   5    |     3      |  15   |
| onboarding-emails    | tech     |   3    |     2      |   6   |

Tracker export (window 2026-05-18..2026-05-25, 7 days):
  payments-checkout:  1 defect
  onboarding-emails:  0 defects

CI data: only 4 days of CI runs since the suite was reorganized. No
prior-release CI history exported.

Just calibrate against this — we want to see what the agent says before
the next release.
```

**Target models:** sonnet (2026-05-25)

**Expected:** The agent halts per Refuse-to-proceed: "Issue a
calibration over <3 releases or <30 days of CI data. The signal is too
thin to override the matrix's authoring judgment. Halt with
`INSUFFICIENT_HISTORY`." It explains the window-requirement (≥3
releases, ≥30 days of CI data) and recommends re-running after enough
data accrues. It does NOT emit any per-row divergence table, does NOT
emit any "recommend raise/lower" recommendation, and does NOT identify
candidate new entries.

**Pass condition:** Output contains the literal string
`INSUFFICIENT_HISTORY` (the documented refuse code). Output does NOT
contain `recommend raise` or `recommend lower` (the calibration verdict
labels — the agent must not issue them at this sample size). Output
mentions either `≥3 releases` or `≥30 days` (the documented window
floor).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — no external
  tracker access or live `git log` required to reproduce. The
  tracker-export.json / ci-results json / git log values are inlined
  in the prompt.
- Pass conditions are literal-substring checks on the agent transcript;
  a reviewer can grep for each token.
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow `Bash(git
  log *), Bash(git diff *), Bash(jq *)`) is read-only — eval re-runs
  cannot mutate the matrix file.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
