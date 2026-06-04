# qa-resilience-drills

Production-grade resilience discipline - DR drills, backup
verification, restore-time SLAs, error budgets, MTTR/MTBF tracking.
Distinct from `qa-chaos-resilience` (experiment-authoring) - this
plugin covers measured, scheduled drills + the metrics they feed.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [dr-drill-runner](skills/dr-drill-runner/SKILL.md) | Per-tier RTO + RPO; pre-drill checklist; drill workflow (announce → fail-over → verify → fail-back → cleanup); post-drill report; cold/warm/hot tier-specific patterns; cadence (monthly/quarterly/annual) |
| Skill | [backup-verification-author](skills/backup-verification-author/SKILL.md) | Per-backup-type integrity (SHA-256 + signature); restore-to-test-env spot check; partial-restore; cross-region replication SLA; retention-policy verification; encryption + key recovery |
| Skill | [restore-time-tests](skills/restore-time-tests/SKILL.md) | TTF segments; baseline timed restore; parallel-restore optimization; PITR latency; partial object-store restore; trend tracking; cold-start latency |
| Skill | [error-budget-tests](skills/error-budget-tests/SKILL.md) | SLI calculation; budget consumption; multi-window multi-burn-rate alerting; freeze-trigger when budget exhausted; rolling-window reset; weekly stakeholder reporting |
| Skill | [mttr-mtbf-tracker](skills/mttr-mtbf-tracker/SKILL.md) | Per-incident schema (detected/acknowledged/mitigated/resolved); MTTD / MTTA / MTTR / MTBF formulae; ITIL alignment; postmortem integration; mitigation vs resolution distinction |
| Skill | [slo-negotiation-prep](skills/slo-negotiation-prep/SKILL.md) | Build-an-X prep pack for the QA - SRE - Product SLO conversation: current error-budget consumption + MTTR/MTBF trend + framed decision question + 3-5 option matrix (impact / reversibility / stakeholder cost) + recommended posture with cited alternatives. |
| Agent | [dr-drill-orchestrator](agents/dr-drill-orchestrator.md) | Executes a planned DR drill end to end: pre-drill checklist, failover, RTO/RPO monitor, fail-back, post-drill report. |
| Agent | [reliability-review-agent](agents/reliability-review-agent.md) | Composes error-budget burn + MTTR/MTBF into a weekly manager-facing reliability review narrative. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-resilience-drills@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
