---
name: error-budget-tests
description: "Build error-budget gate tests - SLO + error-budget calculation per Google SRE workbook (\"difference between target uptime and actual uptime\"); burn-rate alerting; monthly-budget exhaustion test; freeze-trigger when budget consumed. Per sre.google embracing-risk reference. Includes the incident-metrics reference for MTTR / MTBF / MTTD / MTTA - per-incident record schema, calculation formulae, exclusion rules, dashboards-as-code, and target-vs-actual alerting. Use when an SLO and error budget are written down but nothing verifies that burn-rate alerts fire or that the release freeze engages when the budget runs out, or when MTTR / MTBF dashboards report numbers nobody can reproduce."
metadata:
  keywords: "error-budget, slo, sre, burn-rate, feature-freeze"
---

# error-budget-tests

Per [Google SRE - Embracing Risk], "the difference between [SLO] and
[actual uptime] is the 'budget' of how much 'unreliability' is
remaining for the quarter." When the budget is consumed, releases
freeze. Tests verify this contract is enforced.

## When to use

- Adopting SLO-based reliability discipline.
- Auditing whether the error-budget process actually fires (often:
  defined but never triggers).
- After an incident: did the budget burn correctly? Did alerts
  fire? Did the freeze take effect?

## Step 1 - Define the SLI + SLO

| Element | Example |
|---|---|
| SLI (indicator) | `successful_requests / total_requests` over rolling 30-day window |
| SLO (objective) | 99.9% over 30 days |
| Error budget | 100% − 99.9% = 0.1% of 30 days = ~43.2 minutes downtime allowed per 30 days |

Per [Google SRE - Embracing Risk]: "A failure affecting 0.0002% of
queries consumes 20% of a 0.001% quarterly budget."

## Step 2 - Test SLI calculation

```python
def test_sli_excludes_planned_maintenance():
    requests = [
        # Normal traffic
        Request(success=True, ts=t1, was_maintenance=False),
        Request(success=False, ts=t2, was_maintenance=False),
        # Planned maintenance - should NOT count against SLO
        Request(success=False, ts=t3, was_maintenance=True),
    ]
    sli = compute_sli(requests)
    # 1 success / 2 non-maintenance = 0.5 (not 1/3)
    assert sli == 0.5
```

Maintenance windows + planned outages: agreed-upon exclusions
matter. Test the rule.

## Step 3 - Test budget consumption

```python
def test_30_min_outage_consumes_70_percent_of_monthly_budget():
    """30 days × 0.1% = 43.2 min budget. 30 min outage = 69%."""
    monthly_budget_min = 30 * 24 * 60 * 0.001  # 43.2 min
    incident_duration_min = 30

    consumed_pct = (incident_duration_min / monthly_budget_min) * 100
    assert 65 < consumed_pct < 75
```

## Step 4 - Burn-rate alerting

Per the SRE workbook, burn-rate alerting fires when budget is
being consumed faster than safe.

| Window | Burn rate | Alert |
|---|---|---|
| 1 hour | 14.4× | "Critical - page" (consumes 2% in 1 hr) |
| 6 hours | 6× | "Major - ticket" (consumes 5% in 6 hr) |

```python
def test_critical_burn_alert_fires_at_14_4x():
    # Simulate 1-hour window with 14.4× burn
    error_rate_in_window = 0.0144  # 1.44%; 14.4× the 0.1% SLO threshold

    alert = burn_rate_alert(window_seconds=3600, observed_rate=error_rate_in_window)
    assert alert.severity == "critical"
    assert alert.routes_to == "page"
```

Test both directions: burn at 14.4× → critical; below threshold →
no alert.

## Step 5 - Freeze-trigger test

Per [Google SRE - Embracing Risk]: "If SLO violations occur frequently
enough to expend the error budget, releases are temporarily halted."

```python
def test_freeze_engaged_when_budget_below_zero():
    # Budget tracker reports negative (over-spent)
    budget_state = BudgetTracker(slo=0.999, window_days=30)
    budget_state.record_outage_minutes(60)  # 30-day budget is 43 min

    assert budget_state.remaining_seconds < 0
    assert release_gate(budget_state).should_freeze() is True
    assert release_gate(budget_state).reason == "Error budget exhausted"
```

## Step 6 - Reset on rolling window

```python
def test_budget_resets_as_old_outages_age_out():
    # Outage 35 days ago; rolling 30-day window has aged it out
    tracker = BudgetTracker(slo=0.999, window_days=30)
    tracker.record_outage(when=now - timedelta(days=35), duration=timedelta(minutes=60))

    # Window doesn't include 35-day-old event
    assert tracker.remaining_seconds > 0
```

## Step 7 - Multi-window multi-burn-rate (Google SRE practice)

The SRE workbook recommends multi-window burn-rate alerts to balance
sensitivity vs noise:

| Long window | Short window | Burn rate threshold | Alert |
|---|---|---|---|
| 1 hr | 5 min | 14.4× | Page |
| 6 hr | 30 min | 6× | Page |
| 3 day | 6 hr | 1× | Ticket |

The short window confirms the long window isn't a stale alert.
Both must trigger.

```python
def test_both_windows_must_trigger_to_page():
    # Long window says "burn rate high"; short window says "stopped"
    long_burn = 14.5
    short_burn = 0.5

    page_fired = multi_window_alert(long_burn, short_burn,
                                       threshold_long=14.4, threshold_short=14.4)
    assert page_fired is False  # don't page when issue resolved
```

## Step 8 - Stakeholder reporting

Per [Google SRE - Embracing Risk]: "Rather than political negotiations,
teams reference objective metrics." Report budget remaining to
product + leadership:

```python
def test_weekly_budget_report_format():
    report = weekly_budget_report(service="orders", week=current_week)

    assert "remaining_minutes" in report
    assert "burn_rate" in report
    assert "incidents_this_window" in report
    assert "freeze_status" in report
    # Format: machine + human readable (CSV + Slack message)
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| SLO with no enforcement (no freeze) | Targets ignored; reliability degrades | Step 5 freeze-trigger |
| Single burn-rate alert | Either too noisy or too late | Step 7 multi-window |
| Include maintenance in SLI | Planned outages eat real budget | Step 2 exclusion |
| 99.999% SLO ("five nines") for everything | 26 sec/month budget; constant freeze | Tier SLOs per criticality |
| No reporting | Stakeholders don't internalize | Step 8 weekly cadence |

## Limitations

- SLOs measure success rate; latency-based SLOs (P99 < X ms)
  need similar but distinct calculation.
- Budget calculations assume independent failures; correlated
  failures (region-wide outage) eat budget faster than statistics
  predict.
- Real freezes need org-level discipline; tests can't enforce
  cultural change.

## References

- [Google SRE - Embracing Risk] - error budget concept, SLO
  enforcement, freeze trigger
- Google SRE Workbook - Implementing SLOs (consult sre.google for
  the full workbook chapter)
- [references/mttr-mtbf.md](references/mttr-mtbf.md) - incident
  metrics that consume budget: MTTR / MTBF / MTTD / MTTA schema,
  formulae, and dashboards-as-code
- `dr-drill-runner` - drills that
  intentionally affect SLI

[Google SRE - Embracing Risk]: https://sre.google/sre-book/embracing-risk/
