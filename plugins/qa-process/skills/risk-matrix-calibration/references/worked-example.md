# Worked example - risk-matrix calibration

Deep reference for the `risk-matrix-calibration` SKILL.md. The expected output shape end to end: a summary, under-stated and over-stated findings with every dimension citing value / source / window / event count, not-calibrated rows, candidate new entries, and the "what was not done" footer. Names and numbers are illustrative.

```markdown
# Risk-matrix calibration - checkout matrix
Window: 2026-02-01 to 2026-04-30 (3 releases). Density denominator: defects per 1k LOC.

## How to read this
Proposals only. Nothing in the matrix has been changed. Defect data is lagging
and biased: a quiet row may be sound, untested, or unused, and this report
cannot tell those apart. Rows marked "not calibrated" are gaps in the
evidence, not low risk.

## Summary
| Outcome | Rows |
|---|---|
| In agreement (below threshold) | 14 |
| Under-stated | 4 |
| Over-stated | 2 |
| Not calibrated (unmeasurable) | 3 |
| Candidate new entries | 1 |

## Under-stated

### R-12 inventory-cache: propose likelihood 2 -> 4, impact 3 -> 4 (score 6 -> 16)

| Dimension | Matrix | Observed | Observation cited |
|---|---|---|---|
| Likelihood | 2 | 4 | 13 defects over 8.4k LOC = 1.55 per 1k LOC, against a matrix-wide median of 0.31. Source: tracker export 2026-Q2, component = inventory-cache. Window: full. Events: 13. |
| Impact | 3 | 4 | 6 of 13 at severity S1 or S2 (46%); 4 of 13 escaped to production (31%), against a matrix-wide escape rate of 11%. Source: same export, field found_in. Events: 13. |
| Test failure rate (corroborating) | n/a | 6% | Suite covering services/inventory/cache fell from 99% to 94% pass rate across the window. Source: CI results 2026-Q2. Events: 412 runs. |
| Churn (corroborating only) | n/a | high | 47 commits to services/inventory/cache over 89 days, normalised 5.6 commits per 1k LOC, top decile of the repo. Corroborating only, not causal. |

All four citations carry value, source, window and event count. 13 events is
above the 5-event floor, so this is reported as a rate, not as directional.

## Over-stated

### R-03 payments-provider-fallback: propose likelihood 4 -> 2, impact unchanged at 5 (score 20 -> 10)

| Dimension | Matrix | Observed | Observation cited |
|---|---|---|---|
| Likelihood | 4 | 2 | 1 defect over 6.1k LOC = 0.16 per 1k LOC. Source: tracker export 2026-Q2, component = payments-fallback. Events: 1. |
| Impact | 5 | 5 | Single defect at S1. Too few events to move impact. Events: 1. |

**Event count is 1.** Directional only, below the 5-event floor.
Ruled out before proposing: the row is covered (214 test executions in the
window) and exercised (fallback path invoked 1,190 times in production), so
this is not a coverage or exposure artefact. **Open point for the owner:** the
high rating may be a precaution that is currently working, and lowering it
would reduce the testing that keeps it quiet. This report cannot settle that.

## Not calibrated

| Row | Missing input |
|---|---|
| R-08 legacy-tax-import | No source paths recorded; defects cannot be attributed. |
| R-15 partner-sftp-drop | Tracker component field empty on 22 of 24 defects. |
| R-21 admin-audit-log | No automated tests cover the row; failure-rate signal unavailable. |

These are evidence gaps. Do not read them as low risk.

## Candidate new entries

### notifications-webhook-retry (no row in matrix)

| Signal | Value | Observation cited |
|---|---|---|
| Defects | 8 | Tracker export 2026-Q2, component = notifications-webhook. Window: full. |
| Density | 0.94 per 1k LOC | 8 defects over 8.5k LOC; matrix-wide median 0.31. Entry condition met: above median row. |
| Escapes | 2 of 8 (25%) | Field found_in = production. Entry condition met: at least one escape. |
| Severity mix | 3 S1, 2 S2, 3 S3 | Same export. |

Suggested starting rating: likelihood 3, impact 4. **The impact half is the
weaker one**: escape rate is high, but what a missed webhook costs depends on
subscriber retry behaviour, which is a product judgement this report cannot make.

## What was not done
No matrix row was edited. No test selection was re-run. No forecast was made.
```
