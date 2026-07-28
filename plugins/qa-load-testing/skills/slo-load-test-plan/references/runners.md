# Runner executors and a worked plan

Reference material for `slo-load-test-plan`: how the open/closed distinction
appears in the two most common runners, and a full worked example turning a set
of SLOs into a scenario matrix. The plan itself stays runner-agnostic; this file
is where the runner-specific names and the end-to-end example live.

## Open vs closed in the two most common runners

| Runner | Open model | Closed model |
|---|---|---|
| k6 | `constant-arrival-rate`, `ramping-arrival-rate` executors ([k6 open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)) | `constant-vus` and the other non-arrival-rate executors ([k6 open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)) |
| Gatling | `injectOpen` with `atOnceUsers`, `rampUsers`, `constantUsersPerSec`, `rampUsersPerSec`, `stressPeakUsers` ([Gatling injection](https://docs.gatling.io/concepts/injection/)) | `injectClosed` with `constantConcurrentUsers`, `rampConcurrentUsers`, `incrementConcurrentUsers` ([Gatling injection](https://docs.gatling.io/concepts/injection/)) |

Note the trap in the Gatling column: `rampUsers` and `atOnceUsers` are
**open**-model blocks that inject a number of users over a window, while the
closed-model blocks are the `*ConcurrentUsers` family, which hold a level of
concurrency in the system ([Gatling injection](https://docs.gatling.io/concepts/injection/)).
"Users" in a profile name does not mean closed.

## Worked example

Input: a checkout service. SLOs are p95 < 300 ms on `POST /api/checkout` at
peak, p95 < 100 ms on `GET /api/orders` at average, error rate < 0.1% under a 3x
spike, and 99.9% availability over four weeks. Traffic mix is
`GET /api/orders` 60%, `POST /api/checkout` 20%, everything else 20%. Peak is
300 RPS, average 100 RPS, with a 3x spike on sale days.

Resulting scenario matrix:

| Scenario | SLO governed | Profile | Injection | Target | Duration |
|---|---|---|---|---|---|
| `smoke-mix` | none (gate) | Smoke | Open | 1 arrival/sec | 60 s |
| `orders-latency-average` | p95 < 100 ms on orders | Average-load | Open | 100 arrivals/sec | 30 min |
| `checkout-latency-peak` | p95 < 300 ms on checkout | Stress | Open | 300 arrivals/sec | 30 min |
| `spike-error-budget` | error rate < 0.1% | Spike | Open | 900 arrivals/sec | 3 min |
| `soak-availability` | 99.9% over four weeks | Soak | Open | 300 arrivals/sec | 4 h |
| `capacity-ceiling` | none (capacity finding) | Breakpoint | Open | ramp to failure | until failure |

Thresholds:

| Scenario | Expression | Scope | Abort | Traceable to |
|---|---|---|---|---|
| `orders-latency-average` | `p(95)<100` | orders tag | no | orders latency SLO |
| `checkout-latency-peak` | `p(95)<300` | checkout tag | no | checkout latency SLO |
| `spike-error-budget` | `rate<0.001` | all | no (recovery is the measurement) | spike error-rate SLO |
| `soak-availability` | `rate<0.001` | all | yes, `delayAbortEval: '10s'` | 99.9% availability, pro-rata over 4.32M requests = 4,320 failures |
| `capacity-ceiling` | none | n/a | n/a | capacity finding, not an SLO |

Every load number is open-model arrivals per second, because every SLO here is
stated per request rather than per session.
