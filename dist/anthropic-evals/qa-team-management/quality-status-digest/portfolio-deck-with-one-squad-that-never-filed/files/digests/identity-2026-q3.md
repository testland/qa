# Quality digest - 2026-09-19 - identity

**Window:** 2026-06-29 to 2026-09-19  |  **Threshold basis:** defaults
**Deployment definition:** production release  |  **Flake weight:** 2, stale at 14 days

## Summary

| Area | Status | Metric | Trend |
|---|---|---|---|
| CI pass rate | GREEN | 91% | -2 pp vs prior quarter |
| Escape defects | AMBER | 1 escape | +1 |
| Flake debt | AMBER | 1 stale + 2 new | flat |

**Headline: AMBER** (worst area: escape defects, flake debt)

## CI pass rate
- 91% (source: squad CI export, terminal runs only)

## Escape defects
- 1 escape: IDN-3390 (password reset link still valid after use)
- Escape rate: 1 / 22 production releases = 0.05

## Flake debt
- Stale quarantine: 1 entry. New flakes this quarter: 2. Score: (1 x 2) + 2 = 4

## Delivery context
- Deployment frequency: 22 production releases in the window
- Change fail rate: 9%
- Change lead time and failed deployment recovery time: not computed

```text
digest-row: team=identity window=2026-06-29..2026-09-19 pass_rate=0.91 delta_pp=-2 escapes=1 deployments=22 flake_debt=4 rag=AMBER basis=defaults
```
