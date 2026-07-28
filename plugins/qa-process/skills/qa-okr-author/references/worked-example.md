# Worked example - quarter-start draft for a 6-engineer QA team

Deep reference for the `qa-okr-author` SKILL.md. A full quarter-start draft showing the Objective / KR / alignment-check / audit sections wired together, with every numeric target citing its baseline.

Input:
- Objectives the manager has aligned with engineering: (a) reduce escape-defect rate, (b) cut regression cycle time.
- Current state: 4 P1 escapes / quarter, 13 P2 escapes / quarter, regression suite 67min/shard, flake rate 8%, no compliance scope.
- Prior quarter: P1 escapes were 6 (improving), regression was 75min (improving).

Output:

```markdown
# QA OKRs - 2026-Q3 (Jul-Sep)

## Objective 1 - Reduce escape-defect rate

**Why:** Q2 P1 escapes (4) caused ~$X revenue impact per the customer-success retro. Q1 was 6; the trend is improving. Q3 target accelerates the trend.

| # | Type | KR | Baseline | Source |
|---|---|---|---|---|
| KR1.1 | Committed | P1 escapes ≤ 2 | 4 (Q2) | the defect-trend report |
| KR1.2 | Committed | P2 escapes ≤ 8 | 13 (Q2) | the defect-trend report |
| KR1.3 | Aspirational | MTTD P1 ≤ 4h median | 11h (Q2) | `mttr-mtbf-tracker` |
| KR1.4 | Aspirational | Regression-class escapes -50% | 18 → 9 | the defect-clustering export |

## Objective 2 - Cut regression cycle time

**Why:** Engineering's "release weekly" OKR depends on regression < 60 min/shard. Q2 was 67 min.

| # | Type | KR | Baseline | Source |
|---|---|---|---|---|
| KR2.1 | Committed | Regression suite < 60 min/shard | 67 min (Q2) | `test-run-summary-author` |
| KR2.2 | Committed | Sharding factor ≥ 8, no shard > 75 min | 6, max shard 67 min (Q2) | CI config + summary |
| KR2.3 | Aspirational | Per-PR CI cost -30% via TIA | $0.42/PR (Q2) | `regression-suite-selector` adoption |

### Alignment check

| Layer | OKR | Contribution |
|---|---|---|
| Company Q3 theme | "Reduce revenue-affecting incident cost" | Objective 1 directly |
| Engineering | "Release weekly" | Objective 2 directly |
| SRE | "Maintain 99.9% SLO" | Objective 1 (via escape rate) |

### Audit

| KR | Target | Baseline | Source |
|---|---|---|---|
| KR1.1 | ≤2 | 4 | the defect-trend report filter(severity=P1, found_in=production, window=2026-Q2) |
| KR1.2 | ≤8 | 13 | same filter, severity=P2 |
| KR1.3 | ≤4h median | 11h median | `mttr-mtbf-tracker` log 2026-Q2 |
| KR1.4 | 9 | 18 | the defect-clustering export, category=regression, 2026-Q2 |
| KR2.1 | <60 min/shard | 67 min/shard | `test-run-summary-author` cross-run-trend 2026-Q2 |
| KR2.2 | shard≥8 | shard=6 | `playwright.config.ts` workers + `test-run-summary-author` |
| KR2.3 | -30% per-PR | $0.42/PR | CI billing export + `regression-suite-selector` adoption rate |
```
