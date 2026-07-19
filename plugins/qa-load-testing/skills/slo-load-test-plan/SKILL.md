---
name: slo-load-test-plan
description: "Turns a service's SLOs and endpoint traffic mix into a named scenario matrix: one scenario per SLO boundary condition, a load profile (smoke, average-load, stress, soak, spike, breakpoint) per scenario, an open or closed workload injection model, a threshold expression derived from the SLO the scenario guards, and an error-budget calculation that sets the soak run's failure allowance. Stays runner-agnostic and fixes the pass/fail line before any tool is configured. Use when an SLO document and an endpoint list both exist but nobody has decided which load runs to make, what shape of load each carries, or what number would count as a failure."
---

# slo-load-test-plan

Produces one artifact: a load-test plan in which every scenario has a name, a
load shape, an injection model, and a pass/fail line traceable to a stated SLO.

## What this skill owns, and what it does not

| Owned here | Owned elsewhere |
|---|---|
| Which scenarios exist, and why each one exists | Nothing |
| The load shape each scenario applies (profile, ramp, plateau, injection model) | Nothing |
| The pass/fail line each scenario carries, expressed as a threshold derived from an SLO | Nothing |
| The error budget each threshold is sized against | Nothing |
| Runner-specific configuration: executor blocks, protocol setup, feeders, distributed workers, result stores | A per-tool wrapper for k6, Gatling, JMeter, or Locust |
| Aggregating verdicts from several runners into one CI go / no-go | A multi-runner CI gate |
| Finding which commit caused a regression after the plan is already running | A bisection workflow |

The axis is **time**: this skill runs before a runner is chosen. Its output
names metrics, shapes, and numbers in prose and tables, not in a runner's
syntax. One short threshold snippet appears below purely to show what the
numbers turn into; everything else stays declarative.

## Step 1 - Derive named scenarios from SLOs

For every SLO in the input:

1. Identify the target metric: a latency percentile, an availability ratio, an
   error rate, or a throughput floor.
2. Map it to the endpoint or endpoint set it governs, weighted by the traffic
   mix (an endpoint carrying 60% of requests and one carrying 2% do not deserve
   equal scenario budget).
3. Name the scenario after the failure mode it validates, not after the
   endpoint. `checkout-p95-under-peak-load` tells a reader what a red run means;
   `checkout-test-2` does not.

**One SLO can yield several scenarios.** Split whenever the boundary conditions
differ: the same p95 target at average traffic and at peak traffic are two
scenarios, because they need different load shapes and can fail independently.

| SLO | Governs | Scenario |
|---|---|---|
| p95 latency < 300 ms at peak load | `POST /api/checkout` (20% of mix) | `checkout-latency-peak` |
| p95 latency < 100 ms at average load | `GET /api/orders` (60% of mix) | `orders-latency-average` |
| Error rate < 0.1% under a 3x spike | All endpoints, mix preserved | `spike-error-budget` |
| Availability 99.9% over a four-week window | All endpoints, mix preserved | `soak-availability` |

Preserve the traffic mix inside each scenario. A scenario that sends 100% of its
requests to the endpoint under test measures that endpoint in isolation, not in
the contention it actually experiences.

## Step 2 - Assign a load profile

Six canonical profiles, per the
[Grafana k6 test types guide](https://grafana.com/docs/k6/latest/testing-guides/test-types/).
Every scenario from Step 1 gets exactly one.

| Profile | Load level | Duration | What it answers | Shape |
|---|---|---|---|---|
| Smoke | Minimal load | Seconds to a couple of minutes | "Does the script itself work?" k6 defines it as validating "that your script works and that the system performs adequately under minimal load" ([k6 test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/)) | Flat, one or two users |
| Average-load | Average production load | 5 to 60 min ([k6 test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/)) | "Do we meet the SLO on a normal day?" k6: "assess how your system performs under expected normal conditions" | Ramp up, plateau, ramp down |
| Stress | Above the expected average | 5 to 60 min ([k6 test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/)) | "How much headroom is there?" k6: "assess how a system performs at its limits when load exceeds the expected average" | Ramp above average, plateau |
| Soak | Average production load | Hours ([k6 test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/)) | "Does it still meet the SLO after hours?" k6: "assess the reliability and performance of your system over extended periods" | Slow ramp, long plateau |
| Spike | Very high, brief | A few minutes ([k6 test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/)) | "Do we survive a sale or a viral moment?" k6: "validate the behavior and survival of your system in cases of sudden, short, and massive increases in activity" | Near-instant surge, short hold, drop |
| Breakpoint | Increasing until failure | Until the system breaks ([k6 test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/)) | "Where is the ceiling?" k6: "gradually increase load to identify the capacity limits of the system" | Continuous ramp, no plateau |

Selection rules that follow from the definitions:

- A latency SLO stated "at normal traffic" takes **average-load**. Stated "at
  peak" or "with headroom", it takes **stress**.
- Any service with an availability SLO gets a **soak** scenario. Short runs
  cannot observe the failure modes that need hours to appear (memory growth,
  connection-pool and file-descriptor exhaustion, log-volume and disk effects).
- A stated spike event (sale day, campaign launch, cron fan-in) gets its own
  **spike** scenario at the stated multiple of peak, not a bigger stress run.
- **Breakpoint is not a pass/fail scenario.** It has no threshold, because its
  purpose is to find the ceiling by reaching failure. Record its result as a
  capacity number and run it only in an isolated environment.
- Every plan opens with a **smoke** scenario. It gates the rest: if smoke fails,
  the other results are measuring the script, not the service.

## Step 3 - Choose the injection model per scenario

Each scenario also declares one of two workload models. This is the most
frequently mis-stated concept in load-test planning, so state it precisely.

**Closed model.** A fixed population of virtual users, each of which finishes
its current request before starting the next. k6 puts it plainly: "In a closed
model, the execution time of each iteration dictates the number of iterations
executed in your test. The next iteration doesn't start until the previous one
finishes"
([k6 open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)).
The consequence is the one that matters for planning: **throughput is coupled to
latency.** When the service slows down, the offered load falls with it, so the
test quietly stops applying the load you specified. k6 names this effect
coordinated omission
([k6 open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)).

**Open model.** New iterations arrive at a rate you specify, independent of how
long previous ones take. k6: "The open model decouples VU iterations from the
iteration duration. The response times of the target system no longer influence
the load on the target system"
([k6 open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)).
Load is expressed as arrivals per second, and a degrading service keeps
receiving the same arrival rate, so queues build the way they would in
production.

How the distinction appears in the two most common runners:

| Runner | Open model | Closed model |
|---|---|---|
| k6 | `constant-arrival-rate`, `ramping-arrival-rate` executors ([k6 open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)) | `constant-vus` and the other non-arrival-rate executors ([k6 open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)) |
| Gatling | `injectOpen` with `atOnceUsers`, `rampUsers`, `constantUsersPerSec`, `rampUsersPerSec`, `stressPeakUsers` ([Gatling injection](https://docs.gatling.io/concepts/injection/)) | `injectClosed` with `constantConcurrentUsers`, `rampConcurrentUsers`, `incrementConcurrentUsers` ([Gatling injection](https://docs.gatling.io/concepts/injection/)) |

Note the trap in the Gatling column: `rampUsers` and `atOnceUsers` are
**open**-model blocks that inject a number of users over a window, while the
closed-model blocks are the `*ConcurrentUsers` family, which hold a level of
concurrency in the system ([Gatling injection](https://docs.gatling.io/concepts/injection/)).
"Users" in a profile name does not mean closed.

Decision rule for the plan:

- The SLO or the traffic data is stated as a **rate** (RPS, orders per minute,
  events per second): choose **open**. This covers average-load, stress, and
  spike scenarios in almost every plan.
- The SLO or the constraint is stated as a **concurrency level** (seats,
  simultaneous sessions, a connection-pool or licence ceiling): choose
  **closed**, and say which resource the concurrency number represents.
- A soak follows the same rule as its underlying SLO. If availability is
  measured per request, soak open at the average arrival rate; if the service is
  a long-lived session product, soak closed at the target concurrency.
- Never choose closed for a scenario whose purpose is to observe behavior under
  overload. A closed run self-throttles as latency rises and will report a
  passing throughput that the service never actually sustained.

## Step 4 - Derive threshold expressions from the SLO

Every scenario except breakpoint carries at least one threshold, and every
threshold is a restatement of an SLO. Per the
[k6 thresholds documentation](https://grafana.com/docs/k6/latest/using-k6/thresholds/),
a threshold expression has the form `<aggregation_method> <operator> <value>`,
is evaluated against the metric collected during the run, and produces a
non-zero exit code when it fails.

Mechanical translation:

| SLO statement | Metric | Expression |
|---|---|---|
| p95 latency < 300 ms | Request duration trend | `p(95)<300` ([k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)) |
| p99 latency < 500 ms | Request duration trend | `p(99)<500` |
| Error rate < 0.1% | Request failure rate | `rate<0.001` ([k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)) |
| Average latency < 150 ms | Request duration trend | `avg<150` ([k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)) |
| At least 500 completed checkouts per run | Counter | `count>=500` ([k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)) |

Two rules keep the thresholds honest:

**Scope each threshold to the endpoints its SLO governs.** A whole-run p95 is
dominated by whichever endpoint carries the most traffic, so a slow low-volume
checkout hides behind a fast high-volume list call. Thresholds can be attached
to a tagged subset of requests, written as `metric_name{tag_name:tag_value}`,
for example `http_req_duration{type:API}`
([k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)).
The plan states the tag per scenario; the implementer wires it.

**Say per scenario whether a breach aborts the run.** The long form of a
threshold supports `abortOnFail: true` to stop execution on failure and
`delayAbortEval` to postpone evaluation until enough data has accumulated, given
as a relative time string such as `'10s'`
([k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)):

```javascript
thresholds: {
  http_req_duration: [{ threshold: 'p(95)<300', abortOnFail: true, delayAbortEval: '10s' }],
  http_req_failed: ['rate<0.001'],
}
```

Abort when continuing costs something and teaches nothing:

- Any run against production or a shared environment, where continued load past
  a breach burns real error budget for real users.
- Long soaks, where a threshold broken in minute 8 will still be broken in hour
  4 and the remaining hours only cost machine time.
- Any run whose smoke scenario has not passed.

Do not abort when the failure itself is the measurement: spike recovery (you
want to see whether latency returns to baseline after the surge), stress
scenarios exploring headroom, and breakpoint runs, which have no threshold to
abort on at all.

## Step 5 - Size the error budget and calibrate the soak

An error budget is what the SLO leaves over. The Google SRE Workbook states it
directly: "the error budget is 100% minus the SLO", and gives the worked case
that "if you have a 99.9% success ratio SLO, then a service that receives 3
million requests over a four-week period had a budget of 3,000 (0.1%) errors
over that period"
([Implementing SLOs](https://sre.google/workbook/implementing-slos/)). The
Google SRE Book frames the same derivation from the objective: a service whose
SLO is to serve 99.999% of queries per quarter "means that the service's error
budget is a failure rate of 0.001% for a given quarter"
([Embracing Risk](https://sre.google/sre-book/embracing-risk/)).

The formula the plan uses:

```
budget_events = (1 - SLO_target) x total_events_in_window
```

Calibrate the soak in three steps.

1. **Size the production budget.** State the window explicitly, because the
   budget is meaningless without one. Four weeks at an average 100 RPS is
   2,419,200 seconds x 100 = 241,920,000 requests; at a 99.9% SLO the budget is
   241,920 failed requests.
2. **Set the soak's pass/fail line at its pro-rata share.** A four-hour soak at
   300 RPS issues 4,320,000 requests. Its share of the budget is
   `(1 - 0.999) x 4,320,000 = 4,320` failures, which is exactly the SLO's own
   rate. So the threshold is `rate<0.001`, and the plan records how that number
   was reached rather than presenting 0.001 as a round number someone liked.
3. **Add a burn-rate cap if the soak touches a live budget.** Burn rate is "how
   fast, relative to the SLO, the service consumes the error budget"
   ([Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)); a
   constant error rate equal to the budget rate is a burn rate of 1, and double
   that rate exhausts the window's budget in half the time
   ([Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)). When the
   soak runs against production or any environment sharing the measured budget,
   cap the run so a single test cannot spend more than a stated fraction of the
   window's budget, and abort at that count. **Half the window budget is a
   common practitioner convention, not a standard**; pick the fraction
   deliberately and write it down. The SRE Workbook's own illustration of an
   incident causing 1,500 errors against a 3,000-error budget shows what a
   50% draw looks like
   ([Implementing SLOs](https://sre.google/workbook/implementing-slos/)).

Every threshold in the plan should now be traceable: SLO, then window, then
event count, then budget, then the number in the expression. A threshold that
cannot be traced back this way is a guess.

## Output format

One Markdown document:

```markdown
## Load-test plan: <service> (<date>)

### SLO inventory
| SLO | Metric | Window | Current baseline | Source |

### Scenario matrix
| Scenario | SLO governed | Profile | Injection model | Target rate or concurrency | Duration |

### Profile definitions
For each scenario:
- Ramp: <start> to <peak> over <T>
- Plateau: hold <peak> for <T>
- Ramp-down: <peak> to 0 over <T>
- Injection model: open (arrivals/sec) | closed (concurrency), and why
- Traffic mix applied: <endpoint: weight, ...>

### Thresholds
| Scenario | Metric | Scope tag | Expression | Abort on fail | SLO it restates |

### Error-budget derivation
| SLO | Window | Total events | Budget events | Soak allowance | Burn-rate cap |

### Open questions
Anything the plan assumed rather than knew: peak RPS, growth rate, whether an
SLO is agreed or aspirational.
```

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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Thresholds picked as round numbers ("p95 < 500 ms sounds fast") | Passes while the SLO is breached, or fails while it is met | Derive every number from an SLO and record the derivation (Steps 4 and 5) |
| One mega-scenario covering all endpoints | A breach tells you the service is slow, not which endpoint | One scenario per SLO boundary condition, thresholds scoped by tag |
| Closed model used for an overload scenario | Throughput falls with latency, so the intended load is never applied and the run looks healthier than production would ([k6 open and closed models](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/)) | Open model whenever the target is a rate |
| Only spike and stress scenarios | Misses slow degradation; extended-period reliability needs an extended-period run ([k6 test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/)) | A soak scenario for any service with an availability SLO |
| Breakpoint run against production | It is designed to reach the capacity limit, which means designed to break the service ([k6 test types](https://grafana.com/docs/k6/latest/testing-guides/test-types/)) | Isolated environment only, and no threshold attached |
| Choosing the load tool inside the plan | Tool choice depends on stack, CI, skills, and budget, none of which the SLO document contains | Leave the plan runner-agnostic; decide the tool afterwards |
| Writing the plan directly as runner code | The plan stops being reviewable by the people who own the SLOs | Tables first, syntax later |

## Limitations

- **The plan is only as good as the traffic numbers it assumes.** If peak RPS or
  the endpoint mix is wrong, every arrival rate in the matrix is wrong. Record
  the assumed numbers in the Open questions section so a reviewer can challenge
  them.
- **No runnable artifact.** The output is a planning document. Turning it into
  an executable run needs the chosen runner's own configuration.
- **Single-service scope.** A plan covers one service's endpoints. A flow that
  spans services (checkout calling inventory and payment) needs a plan per
  service plus an agreement on which one owns the end-to-end SLO.
- **Breakpoint results are not comparable across environments.** A ceiling found
  in staging bounds staging, not production, unless the two are provisioned
  identically.
