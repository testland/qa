# Output templates - per-team digest and portfolio review

The two full artifacts the skill emits. Part 1 (Step 5) writes the per-team digest; its final
`digest-row` line is the machine-readable contract the portfolio roll-up consumes. Part 2
(Step 10) writes the portfolio review by copying each team's `digest-row` values unchanged.

## Per-team digest (Step 5)

````markdown
# Quality digest - 2026-07-12 - checkout

**Window:** 2026-07-06 to 2026-07-12  |  **Threshold basis:** defaults
**Deployment definition:** production release  |  **Flake weight:** 2, stale at 14 days

## Summary

| Area | Status | Metric | Trend |
|---|---|---|---|
| CI pass rate | GREEN | 94% | +2 pp vs prior window |
| Escape defects | AMBER | 1 escape | flat |
| Flake debt | RED | 5 stale + 2 new | +3 entries |

**Headline: RED** (worst area: flake debt)

## CI pass rate
- This window: 94% (47 of 50 terminal runs; 3 cancelled runs excluded)
- Prior window: 92%, so the trend is +2 pp
- Failed runs: 8841, 8907, 8955

## Escape defects
- Escapes this window: 1 (BUG-4412, discount code applied twice at checkout)
- Escape rate: 1 / 12 production deployments = 0.08
- Root-cause classification is not done here; this is a count

## Flake debt
- Stale quarantine (over 14 days): 5 entries (oldest quarantined 2026-05-30)
- New flakes this window: 2
- Flake debt score: (5 x 2) + 2 = 12

## Delivery context (DORA, partial)
- Deployment frequency: 12 deployments in window
- Change fail rate: 8% of deployments required immediate intervention
- Change lead time and failed deployment recovery time: not computed, no commit
  timestamp or incident feed available. Definitions per dora.dev.
- Escape rate above is a defect-leakage measure and is deliberately not listed here

## Top risks
1. Flake debt is growing faster than it is repaired - area: E2E suite
2. Checkout discount path has no regression test - area: payments

## Open items
- Deployment count covers production releases only; staging pushes not counted
- 3 defects closed this window carried no environment label, so escape
  attribution for them is unverified

```text
digest-row: team=checkout window=2026-07-06..2026-07-12 pass_rate=0.94 delta_pp=+2 escapes=1 deployments=12 flake_debt=12 rag=RED basis=defaults
```
````

## Portfolio review (Step 10)

```markdown
# Portfolio quality review - 2026-Q3 - 4 teams

**Headline: RED** (checkout)  |  **Prior quarter headline:** AMBER

## Per-team roll-up

| Team | Pass rate | Trend | Escapes | Flake debt | Deploy freq | Change fail rate | RAG | Basis | Tag |
|---|---|---|---|---|---|---|---|---|---|
| checkout | 94% | +2 pp | 1 | 12 | 12 | 8% | RED | defaults | INVEST |
| search | 97% | +1 pp | 0 | 2 | 31 | 3% | GREEN | own | STABLE |
| identity | 88% | -6 pp | 2 | 7 | 9 | 11% | RED | defaults | INVEST |
| billing | 93% | 0 pp | 1 | 4 | 14 | 5% | AMBER | defaults | WATCH |

Values copied from each team's digest-row; not recomputed.

## Risk heatmap (severity x blast radius)

|  | Blast low | Blast medium | Blast high |
|---|---|---|---|
| **RED** | - | identity | checkout |
| **AMBER** | - | billing | - |
| **GREEN** | search | - | - |

Blast bands: high = revenue path, medium = login or account path, low = internal.

## Capacity

| Team | QE headcount | Open roles | Open / headcount | Automation ratio | Structure | Capacity flag |
|---|---|---|---|---|---|---|
| checkout | 4 | 2 | 50% | 60% | embedded | FLAGGED |
| search | 5 | 0 | 0% | 85% | embedded | - |
| identity | 3 | 1 | 33% | 40% | siloed | FLAGGED (small team: 1 of 3) |
| billing | 4 | 0 | 0% | 55% | embedded | - |

## INVEST teams

- **checkout** - RED on flake debt (12, up from 5), 2 of 4 QE roles open. No
  existing commitment references flake reduction: no funded recovery path.
- **identity** - RED on pass rate (88%, -6 pp) and 2 escapes. An existing
  commitment covers escape reduction; nothing covers pass rate.

## What this review did not consider

Individual contributor performance, vendor and tooling contracts, roadmap-level
risk, and anything outside the four teams' own digests.
```
