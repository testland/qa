# qa-resilience-drills

Production-grade resilience discipline - DR drills with backup
verification and restore-time SLAs worked in references, error budgets,
and MTTR/MTBF tracking. Distinct from `qa-chaos` (experiment-authoring) -
this plugin covers measured, scheduled drills + the metrics they feed.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [dr-drill-runner](skills/dr-drill-runner/SKILL.md) | The full DR-drill discipline: per-tier RTO + RPO; pre-drill checklist; drill workflow (announce → fail-over → verify → fail-back → cleanup); the supervised run protocol (refuse rules, RTO/RPO monitor, abort-on-breach); post-drill report; cold/warm/hot patterns; cadence. Backup-integrity verification and restore-time / RTO measurement live in references/. |
| Skill | [error-budget-tests](skills/error-budget-tests/SKILL.md) | SLI calculation; budget consumption; multi-window multi-burn-rate alerting; freeze-trigger when budget exhausted; rolling-window reset; weekly stakeholder reporting. The MTTR / MTTA / MTTD / MTBF incident-metrics schema + formulae live in references/. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-resilience-drills@testland-qa
```
