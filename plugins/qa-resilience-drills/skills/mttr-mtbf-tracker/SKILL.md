---
name: mttr-mtbf-tracker
description: "Reference for tracking MTTR (Mean Time To Recovery) / MTBF (Mean Time Between Failures) / MTTD (Mean Time To Detection) / MTTA (Mean Time To Acknowledge) - incident-record schema, calculation formulae, dashboards-as-code, target-vs-actual alerting. Aligns with ITIL incident management + ISO 20000 + Google SRE incident response chapter. Use when incident reporting is being stood up from scratch, or when an existing MTTR / MTBF dashboard reports numbers nobody can reproduce or agree on the definition of."
metadata:
  keywords: "mttr, mtbf, mttd, mtta, incident-metrics, sre"
---

# mttr-mtbf-tracker

Reference document for the four canonical incident-response metrics.
This is a *reference skill* - incidents are tracked in your IR tool
(PagerDuty, Opsgenie, FireHydrant, custom), and this skill defines
the schema + formulae so dashboards reflect reality.

## When to use

- Standing up incident reporting from scratch.
- Auditing existing incident metrics - are MTTR / MTBF actually
  being computed correctly?
- Setting reliability targets (cross-ref `error-budget-tests`).

## Step 1 - Per-incident schema

Required fields:

```json
{
  "incident_id": "INC-2026-05-06-001",
  "service": "orders",
  "severity": "SEV-1",
  "detected_at": "2026-05-06T10:23:14Z",
  "acknowledged_at": "2026-05-06T10:25:02Z",
  "mitigated_at": "2026-05-06T10:54:11Z",
  "resolved_at": "2026-05-06T11:42:33Z",
  "root_cause_category": "deployment-config",
  "is_planned_maintenance": false,
  "customer_impact": true
}
```

Distinct timestamps for **detected** / **acknowledged** /
**mitigated** (impact stopped) / **resolved** (root cause
remediated). Conflating them inflates / deflates metrics.

## Step 2 - Calculation formulae

```
MTTD = mean(detected_at − incident_start_at)
MTTA = mean(acknowledged_at − detected_at)
MTTR = mean(mitigated_at − detected_at)   # OR resolved_at depending on definition
MTBF = mean(time between mitigation of one incident and detection of next)
```

| Metric | Window | Lower / Higher |
|---|---|---|
| MTTD | rolling 90 days | Lower better (faster detection) |
| MTTA | rolling 90 days | Lower better (responsive on-call) |
| MTTR | rolling 90 days | Lower better (faster recovery) |
| MTBF | rolling 365 days | Higher better (more time between failures) |

**Definition note:** MTTR can mean Mitigation OR Resolution; pick one
per organization and document. Mixing yields misleading trends.

## Step 3 - Exclusion rules

| Should exclude | Why |
|---|---|
| Planned maintenance | Not a failure |
| Test/drill incidents | Don't pollute reliability metrics |
| Issues out of customer-trust path (internal-only) | Per organization policy - be explicit |
| Duplicates / "same root cause" within window | Inflates incident count |

Schema field `is_planned_maintenance` + `customer_impact` allow
filtered queries.

## Step 4 - Dashboards-as-code

```yaml
# Grafana dashboard fragment
panels:
  - title: "MTTR (rolling 90 days)"
    targets:
      - expr: |
          avg_over_time(
            (
              incident_mitigated_ts - incident_detected_ts
            )[90d:1d]
          )
        format: "duration"
  - title: "MTBF (rolling 365 days)"
    targets:
      - expr: |
          ... (your time-series store DSL)
```

Treat dashboards as code (versioned, reviewed). Avoid clicked-up
dashboards that nobody can rebuild.

## Step 5 - Target-vs-actual alert

```yaml
- alert: MTTR_TARGET_BREACH
  expr: avg_over_time(mttr_seconds[30d]) > 1800  # 30 min target
  for: 1h
  labels: { severity: warning }
  annotations:
    summary: "30-day MTTR exceeds 30-min target"
```

Alert fires when the *trend* breaks the target - not on individual
incidents.

## Step 6 - ITIL alignment

ITIL 4 (Information Technology Infrastructure Library) practices
incident management map to these metrics:

| ITIL term | This skill's metric |
|---|---|
| Time to detect | MTTD |
| Time to acknowledge / response | MTTA |
| Time to restore service | MTTR (mitigation) |
| Time to resolve | MTTR (resolution) |
| Mean time between failures | MTBF |

ITIL doesn't prescribe specific formulae; this skill makes them
explicit. Pair with your ITSM tool (ServiceNow, Jira Service
Management).

## Step 7 - Postmortem integration

Each incident has a postmortem. Postmortem fields feed back into
the incident schema:

| Postmortem field | Schema field |
|---|---|
| Detection mechanism | (annotation; helps drive MTTD lower) |
| Root cause | `root_cause_category` |
| Action items | (separate table; link by incident_id) |
| Was the runbook used? | (annotation; informs runbook-quality investment) |

Action items have due dates; track completion.

## Step 8 - Distinguish MTTR mitigation vs resolution

- **MTTR-mitigation**: stop customer impact (rollback, traffic
  shift, scale up). Prioritized in incident response.
- **MTTR-resolution**: fix the root cause permanently. May happen
  days/weeks later.

Many organizations report only MTTR-mitigation (better numbers,
truer to customer experience). Per [Google SRE - Embracing Risk],
the customer-facing metric is what matters for SLO purposes.

Document which definition your reports use; both are legitimate.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mixed mitigation/resolution in MTTR | Trends incoherent | Pick one (Step 8) |
| Include maintenance / test incidents | Inflated incident count | Step 3 exclusion |
| Dashboard built once, never revisited | Stale; unrelated to current SLOs | Dashboards-as-code (Step 4) |
| MTTR target without MTTD focus | Fast recovery from things you found late ≠ fast for customer | Track all four |
| Postmortem disconnected from metrics | Action items don't reduce future MTTR | Step 7 integration |

## Limitations

- MTTR / MTBF are means: they hide tail behavior. Pair with P95
  / P99 incident-duration views for the worst case.
- Single-team services have low N; statistics jittery.
- Some organizations report "Mean Time To Innocence" (time until
  someone proves a service isn't at fault) - not in this skill's
  scope.

## References

- [Google SRE - Embracing Risk] - incident-metrics framing
- ITIL 4 incident management - ITSM standard
- ISO/IEC 20000 service management - high-level governance
- [`error-budget-tests`](../error-budget-tests/SKILL.md) - per-incident
  budget consumption
- [`dr-drill-runner`](../dr-drill-runner/SKILL.md) - drills produce
  incidents with `is_planned_maintenance: true`

[Google SRE - Embracing Risk]: https://sre.google/sre-book/embracing-risk/
