# Quality digest - 2026-09-19 - search

**Window:** 2026-06-29 to 2026-09-19  |  **Threshold basis:** own (green at 95%, calibrated to our historical median of 98%)
**Deployment definition:** production release  |  **Flake weight:** 2, stale at 14 days

## Summary

| Area | Status | Metric | Trend |
|---|---|---|---|
| CI pass rate | GREEN | 96% | 0 pp vs prior quarter |
| Escape defects | GREEN | 0 escapes | flat |
| Flake debt | GREEN | 0 stale + 2 new | -1 |

**Headline: GREEN** (no area worse than green)

## CI pass rate
- 96% (source: squad CI export, terminal runs only)
- Our green cut is 95%, not the default 90%, because our median over the last
  six quarters is 98%

## Escape defects
- 0 escapes this quarter
- Escape rate: 0 / 48 production releases = 0.00

## Flake debt
- Stale quarantine: 0 entries. New flakes this quarter: 2. Score: (0 x 2) + 2 = 2

## Delivery context
- Deployment frequency: 48 production releases in the window
- Change fail rate: 3%
- Change lead time and failed deployment recovery time: not computed

```text
digest-row: team=search window=2026-06-29..2026-09-19 pass_rate=0.96 delta_pp=0 escapes=0 deployments=48 flake_debt=2 rag=GREEN basis=own
```
