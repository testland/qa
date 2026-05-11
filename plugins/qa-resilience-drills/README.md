# qa-resilience-drills

Production-grade resilience discipline — DR drills, backup
verification, restore-time SLAs, error budgets, MTTR/MTBF tracking.
Distinct from `qa-chaos-resilience` (experiment-authoring) — this
plugin covers measured, scheduled drills + the metrics they feed.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [dr-drill-runner](skills/dr-drill-runner/SKILL.md) | S3 | Per-tier RTO + RPO; pre-drill checklist; drill workflow (announce → fail-over → verify → fail-back → cleanup); post-drill report; cold/warm/hot tier-specific patterns; cadence (monthly/quarterly/annual) |
| Skill | [backup-verification-author](skills/backup-verification-author/SKILL.md) | S3 | Per-backup-type integrity (SHA-256 + signature); restore-to-test-env spot check; partial-restore; cross-region replication SLA; retention-policy verification; encryption + key recovery |
| Skill | [restore-time-tests](skills/restore-time-tests/SKILL.md) | S3 | TTF segments; baseline timed restore; parallel-restore optimization; PITR latency; partial object-store restore; trend tracking; cold-start latency |
| Skill | [error-budget-tests](skills/error-budget-tests/SKILL.md) | S3 | SLI calculation; budget consumption; multi-window multi-burn-rate alerting; freeze-trigger when budget exhausted; rolling-window reset; weekly stakeholder reporting |
| Skill | [mttr-mtbf-tracker](skills/mttr-mtbf-tracker/SKILL.md) | S2 | Per-incident schema (detected/acknowledged/mitigated/resolved); MTTD / MTTA / MTTR / MTBF formulae; ITIL alignment; postmortem integration; mitigation vs resolution distinction |
| Skill | [slo-negotiation-prep](skills/slo-negotiation-prep/SKILL.md) | S3 | Build-an-X prep pack for the QA–SRE–Product SLO conversation: current error-budget consumption + MTTR/MTBF trend + framed decision question + 3-5 option matrix (impact / reversibility / stakeholder cost) + recommended posture with cited alternatives. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-resilience-drills@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
