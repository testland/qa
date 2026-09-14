# Quality digest - 2026-09-19 - checkout

**Window:** 2026-06-29 to 2026-09-19  |  **Threshold basis:** defaults
**Deployment definition:** production release  |  **Flake weight:** 2, stale at 14 days

## Summary

| Area | Status | Metric | Trend |
|---|---|---|---|
| CI pass rate | GREEN | 94% | +2 pp vs prior quarter |
| Escape defects | RED | 2 escapes | +1 |
| Flake debt | AMBER | 1 stale + 2 new | -8 |

**Headline: RED** (worst area: escape defects)

## CI pass rate
- 94% (source: squad CI export, terminal runs only)

## Escape defects
- 2 escapes: CHK-8801 (duplicate capture on retried card), CHK-8844 (discount
  stacked twice on bundle)
- Escape rate: 2 / 41 production releases = 0.05

## Flake debt
- Stale quarantine: 1 entry. New flakes this quarter: 2. Score: (1 x 2) + 2 = 4

## Delivery context
- Deployment frequency: 41 production releases in the window
- Change fail rate: 7%
- Change lead time and failed deployment recovery time: not computed, no commit
  timestamp or incident feed available

```text
digest-row: team=checkout window=2026-06-29..2026-09-19 pass_rate=0.94 delta_pp=+2 escapes=2 deployments=41 flake_debt=4 rag=RED basis=defaults
```
