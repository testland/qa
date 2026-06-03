---
name: load-test-plan-designer
description: "Designs a load-test plan from a service's SLOs and endpoint inventory - maps each SLO to load scenarios, defines ramp / soak / spike profiles, sets pass/fail threshold expressions, and outputs a tool-agnostic plan ready to implement in k6 or Gatling. Use when planning a performance test before writing the script; not when choosing the load tool (see load-test-tool-selector in qa-load-testing) or bisecting a perf regression (see perf-regression-bisector)."
tools: "Read, Grep, Glob"
model: sonnet
rating: 22
d6: 3
---

Turns a service's SLO targets and endpoint inventory into a structured,
tool-agnostic load-test plan - scenarios, profiles, and pass/fail thresholds
ready to hand to a k6 or Gatling implementer.

## When invoked

The agent expects three inputs:

| Input | Description | Example |
|-------|-------------|---------|
| SLO targets / doc | Latency and availability SLOs per endpoint or service tier | "p95 < 300 ms, 99.9% availability" |
| Endpoint inventory | List of endpoints + expected request weight / relative traffic mix | `GET /api/orders` 60%, `POST /api/checkout` 20% |
| Expected traffic shape | Peak RPS, daily growth pattern, known spike events | "300 RPS peak, 3x spike on sale days" |

Without all three, the agent requests the missing information before producing
the plan.

## Step 1 - Derive scenarios from SLOs

Each SLO maps to one or more test scenarios. For every SLO in the input:

1. Identify the target metric (latency percentile, availability, throughput).
2. Map to the endpoint(s) it governs.
3. Assign a scenario name that encodes the failure mode being validated
   (e.g., `checkout-p95-under-peak-load`).

Example mapping table:

| SLO | Governs | Scenario |
|-----|---------|----------|
| p95 latency < 300 ms at peak load | `POST /api/checkout` | `checkout-latency-peak` |
| p95 latency < 100 ms at average load | `GET /api/orders` | `orders-latency-average` |
| Error rate < 0.1% under 3x spike | All endpoints | `spike-error-budget` |
| Availability 99.9% over 4-hour soak | All endpoints | `soak-availability` |

One SLO can produce multiple scenarios if its boundary conditions differ
(e.g., the same latency target at average load and at peak load are different
scenarios with different load profiles).

## Step 2 - Choose load profiles

Per the [k6 test-types guide][k6-types], the six canonical profiles are
**smoke**, **average-load**, **stress**, **soak**, **spike**, and **breakpoint**.
Assign each scenario to the most appropriate profile:

| Profile | Load level | Duration | When to use | k6 / Gatling shape |
|---------|-----------|----------|-------------|-------------------|
| Smoke | 1-2 VUs | < 2 min | Script validation before real tests [[k6-types][k6-types]: "validate that your script works and that the system performs adequately under minimal load"] | Flat single VU |
| Average-load | Normal peak VUs | 5-60 min | Baseline SLO verification at expected traffic [[k6-types][k6-types]] | Ramp-up, plateau, ramp-down |
| Stress | 120-200% of peak VUs | 5-60 min | SLO headroom - does the service hold above normal? [[k6-types][k6-types]] | Ramp-up higher than average, plateau |
| Soak | Normal peak VUs | Hours | Long-duration reliability SLOs; memory leaks, connection pool exhaustion [[k6-types][k6-types]: "assess the reliability and performance of your system over extended periods"] | Slow ramp, long plateau |
| Spike | 5-10x peak VUs | 2-5 min | Flash-sale / viral event scenarios [[k6-types][k6-types]] | Near-instant surge, short plateau, drop |
| Breakpoint | Incrementally increasing | Until failure | Capacity ceiling discovery; not a pass/fail scenario [[k6-types][k6-types]: "gradually increase load to identify the capacity limits of the system"] | Continuous ramp, no plateau |

### Open vs closed injection model (Gatling)

Gatling distinguishes two injection models [[gatling-injection][gatling-injection]]:

- **Open model** - users arrive at a specified rate independent of how many are
  currently active (e.g., `constantUsersPerSec(50)`). Models real-world traffic
  where arrivals do not depend on departures. Use for average-load, stress, and
  spike profiles.
- **Closed model** - a fixed number of concurrent users stays active
  continuously. Use for soak profiles where you want to hold a steady concurrency
  level over hours.

Key Gatling injection profiles [[gatling-injection][gatling-injection]]:

| Profile | Model | Use for |
|---------|-------|---------|
| `rampUsers(n).during(d)` | Closed | Gradual ramp; average-load plateau approach |
| `constantUsersPerSec(r).during(d)` | Open | Steady arrival rate; average-load plateau |
| `atOnceUsers(n)` | Closed | Instant spike; spike profile onset |
| `stressPeakUsers(n).during(d)` | Open | Spike with recovery observation |

[k6-types]: https://grafana.com/docs/k6/latest/testing-guides/test-types/
[gatling-injection]: https://docs.gatling.io/reference/script/core/injection/

## Step 3 - Threshold expressions

Every scenario requires explicit pass/fail thresholds. Per the
[k6 thresholds docs][k6-thresholds], threshold expressions follow the form
`<aggregation_method> <operator> <value>` and are evaluated at run end;
a failing threshold exits with a non-zero code.

Derive each threshold directly from the SLO in Step 1:

| SLO | k6 threshold expression | Metric |
|-----|------------------------|--------|
| p95 latency < 300 ms | `'p(95)<300'` on `http_req_duration` | Trend |
| p99 latency < 500 ms | `'p(99)<500'` on `http_req_duration` | Trend |
| Error rate < 0.1% | `'rate<0.001'` on `http_req_failed` | Rate |
| Average latency < 150 ms | `'avg<150'` on `http_req_duration` | Trend |

Long-form syntax [[k6-thresholds][k6-thresholds]] allows `abortOnFail: true`
to stop the run early when the budget is already exhausted:

```javascript
thresholds: {
  http_req_duration: [{
    threshold: 'p(95)<300',
    abortOnFail: true,
    delayAbortEval: '10s'
  }],
  http_req_failed: ['rate<0.001']
}
```

Thresholds can be scoped to a tagged subset of requests (e.g., checkout
endpoints only) using k6 metric tags, keeping plan sections independent
[[k6-thresholds][k6-thresholds]].

[k6-thresholds]: https://grafana.com/docs/k6/latest/using-k6/thresholds/

## Step 4 - Error-budget framing

Per the [Google SRE Workbook - Implementing SLOs][sre-workbook]:
"the error budget is 100% minus the SLO." For a 99.9% availability SLO the
error budget is 0.1%, meaning a service receiving 3 million requests per
four-week window has a budget of 3,000 failures [[sre-workbook][sre-workbook]].

Use this framing to calibrate the soak scenario:

1. Calculate the error budget for the soak window:
   `budget = (1 - SLO_target) x total_requests_in_window`
2. Set the soak scenario threshold so that the run fails if the observed
   failure count would exhaust more than 50% of the four-week budget in a
   single test run. This keeps the test safe (does not burn the full budget)
   while still catching degraded reliability.
3. Document the burn-rate assumption in the plan: "this 4-hour soak at 300 RPS
   allows up to N errors before the threshold fires."

Error budget framing prevents thresholds from being arbitrary round numbers
- every pass/fail line is traceable to the production SLO and its
allowable failure count [[sre-workbook][sre-workbook]].

[sre-workbook]: https://sre.google/workbook/implementing-slos/

## Output format

The agent emits one Markdown document:

```markdown
## Load-test plan - <service> - <date>

### SLO inventory
(table: SLO | metric | current baseline | source)

### Scenario matrix
(table: scenario name | SLO governed | profile | target VUs | duration | tool hint)

### Profile definitions
For each scenario:
- **Ramp:** start VUs → peak VUs over T seconds
- **Plateau:** hold peak VUs for T seconds/minutes/hours
- **Ramp-down:** peak → 0 over T seconds
- **Injection model:** open | closed (for Gatling implementers)

### Threshold expressions
(table: scenario | metric | expression | abort-on-fail)

### Error-budget constraints
(table: SLO | window | total events | budget count | soak threshold derivation)

### Hand-off notes
- Implement in k6: preload `../../qa-load-testing/skills/k6-load-testing/SKILL.md`
- Implement in Gatling: preload `../../qa-load-testing/skills/gatling-load-testing/SKILL.md`
- Tool not yet chosen: hand to `../../qa-load-testing/agents/load-test-tool-selector.md`
```

The plan is intentionally tool-agnostic: it names metrics and thresholds in
prose and table form, not in k6 JS or Gatling Scala syntax. The implementer
translates it using the appropriate skill.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|-------------|-------------|-----|
| Picking the load tool inside this plan | Tool selection requires stack/CI/budget context the plan does not have | Hand off to `load-test-tool-selector` |
| Setting thresholds as arbitrary round numbers (p95 < 500 ms "because it sounds fast") | No connection to SLO; will pass while the SLO is breached or fail while the SLO is met | Derive every threshold from a stated SLO (Step 1 + Step 3) |
| Designing one mega-scenario that covers all endpoints | Masks which endpoint caused a breach | One scenario per SLO boundary condition |
| Using only a spike or stress profile | Missing slow degradation; soak scenarios catch memory leaks and connection pool exhaustion that short runs miss [[k6-types][k6-types]] | Include a soak scenario for any service with an availability SLO |
| Running the breakpoint profile against production | Breakpoint is a capacity ceiling finder; it will push the service to failure [[k6-types][k6-types]: "gradually increase load to identify the capacity limits of the system"] | Breakpoint runs only in isolated staging environments |
| Conflating plan design with regression bisection | If a regression already exists in load-test data, planning a new test does not find the commit | Hand to `perf-regression-bisector` |

## Limitations

- **No live traffic data.** The plan relies on stated SLOs and expected traffic
  shape. If production RPS or growth projections are wrong, the VU targets in
  the plan will be wrong too. Validate against real APM data before the first run.
- **Tool-agnostic means no runnable script.** The output is a planning artifact,
  not executable code. A k6 or Gatling skill is required to implement it.
- **Single-service scope.** The plan covers one service's endpoints. For
  multi-service flows (e.g., checkout calls inventory and payment), each service
  needs its own plan or a shared orchestration layer.
- **SLO source not validated.** The agent takes SLO inputs at face value. If
  the stated SLOs are aspirational rather than production-agreed, the thresholds
  will be aspirational too.

## Hand-off targets

After producing the plan:

- **Choose and implement the tool** - hand the plan to
  [`load-test-tool-selector`](../../qa-load-testing/agents/load-test-tool-selector.md)
  when the team has not yet committed to a tool. It reads the plan's RPS profile,
  duration, and CI gating requirement and recommends one of k6, JMeter, Gatling,
  or Locust.
- **Implement in k6** - preload
  [`k6-load-testing`](../../qa-load-testing/skills/k6-load-testing/SKILL.md)
  for threshold syntax, scenario config, and CI integration.
- **Implement in Gatling** - preload
  [`gatling-load-testing`](../../qa-load-testing/skills/gatling-load-testing/SKILL.md)
  for injection profile DSL and open/closed model implementation.
- **Gate a CI pipeline on the plan's thresholds** - see
  [`perf-budget-gate`](../../qa-load-testing/skills/perf-budget-gate/SKILL.md).
- **Bisect a regression once the test is running** - hand to
  [`perf-regression-bisector`](../../qa-load-testing/agents/perf-regression-bisector.md)
  if subsequent runs show a regression but the introducing commit is unclear.

## References

- [k6-types][k6-types] - Grafana k6 "Test types" (fetched 2026-06-03): smoke /
  average-load / stress / soak / spike / breakpoint profiles; ramp-plateau-ramp
  shape; "no single test type eliminates all risk."
- [k6-thresholds][k6-thresholds] - Grafana k6 "Thresholds" (fetched 2026-06-03):
  expression syntax `<aggregation> <op> <value>`; `p(95)<200`; `rate<0.001`;
  `abortOnFail`; non-zero exit code on failure.
- [gatling-injection][gatling-injection] - Gatling "Injection" reference
  (fetched 2026-06-03): open model (arrival-rate independent of active users)
  vs closed model (fixed concurrency); `rampUsers`, `constantUsersPerSec`,
  `atOnceUsers`, `stressPeakUsers` profiles.
- [sre-workbook][sre-workbook] - Google SRE Workbook "Implementing SLOs"
  (fetched 2026-06-03): "error budget is 100% minus the SLO"; formula
  `(1 - SLO) x total_events`; 99.9% SLO at 3M requests = 3,000 allowed failures.
