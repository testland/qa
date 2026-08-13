# Worked example: checkout pod-kill drill

A full run of `chaos-drill-protocol` end to end. Service `checkout`, staging,
`N = 12` replicas. The experiment definition and its hypothesis already exist.

## Drill contract, agreed and frozen before injection

```yaml
hypothesis:
  metric: checkout_completion_rate
  threshold: ">= 95%"
  window: "5m"
target:
  environment: staging
  namespace: checkout-staging
  service: checkout
  replicas: 12
fault: pod-kill
blast_radius:
  max_replicas_affected: 3        # 25% of 12; survivors carry about 1.33x load
  max_duration: "5m"
sample_interval: "10s"            # convention; 6 samples inside the 60s dwell time
abort_criteria:
  - id: error-budget
    signal: http_5xx_rate
    threshold: "> 2%"             # agreed share of remaining quarterly error budget
    dwell: "30s"
  - id: blast-radius
    signal: unready_replicas
    threshold: "> 3"
    dwell: "0s"
  - id: latency
    signal: p99_latency
    threshold: "> 10x baseline"
    dwell: "60s"
  - id: downstream
    signal: payments_slo_state
    threshold: "breached"
    dwell: "0s"
recovery_criteria:
  ready_replicas: "== 12"
  error_rate: "<= baseline + 0.4%"   # from observed baseline variance, not the 10% default
  p99_latency: "<= baseline + 12%"   # from observed baseline variance
  settle_window: "2m"
  timeout: "5m"
rollback:
  action: "remove the injected pod-kill fault from the checkout-staging namespace"
  owner: "on-call SRE, present for the full run"
  rehearsed: "yes, run clean 8 minutes before injection, completed in 6s"
```

## Pre-flight

| Gate | Result | Evidence |
|---|---|---|
| Non-production target | PASS | Resolved context `checkout-staging`, no production identifier |
| Healthy measured baseline | PASS | 12 of 12 ready; `http_5xx_rate` 0.2%; p99 240ms; stable across a 10-minute window |
| Live observability | PASS | Freshest sample 4s old on all four abort signals |
| Exercised rollback | PASS | Rollback run clean at T minus 8m, returned success in 6s, no state change |

All four passed, so the drill proceeds. Had any single gate failed, the drill
would have stopped here.

## Live run

```
T+0:00  inject pod-kill, 3 of 12 replicas targeted
T+0:10  ready 10/12  5xx 0.3%  p99 268ms   within all bounds
T+0:20  ready  9/12  5xx 0.6%  p99 310ms   within all bounds
T+0:30  ready  9/12  5xx 1.1%  p99 402ms   within all bounds
T+0:40  ready  8/12  5xx 2.4%  p99 620ms   5xx above 2%, dwell timer starts
T+0:50  ready  8/12  5xx 2.9%  p99 880ms   5xx still above 2%, dwell 20s
T+1:00  ready  8/12  5xx 3.3%  p99 1140ms  5xx above 2% for 30s -> ABORT
T+1:06  rollback complete (6s, matching the rehearsal)
```

The `error-budget` criterion fired at its written threshold and dwell time. No
one relitigated the 2% while the graph was climbing. Note also that a fourth
replica went unready at T+0:40 without being targeted, which is the cascade the
`blast-radius` criterion exists to catch and which would have fired at 4.

## Recovery validation

```
T+1:06  rollback complete, settle window starts
T+2:10  ready 11/12  5xx 0.9%  p99 430ms
T+3:20  ready 12/12  5xx 0.3%  p99 262ms   all checks inside tolerance
T+5:20  all checks held continuously for the 2m settle window -> RECOVERED
```

Verdict `RECOVERED`, unassisted, 4m14s after rollback, inside the 5m timeout.
