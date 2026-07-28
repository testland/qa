# How each tool expresses open vs closed workload models

Open holds arrival rate constant; closed holds concurrency constant. This table
maps the two models onto the five tools, with the exact executor / injection
names each one uses.

| Tool | Open (arrival rate held constant) | Closed (concurrency held constant) |
|---|---|---|
| k6 | `constant-arrival-rate`, `ramping-arrival-rate` | `constant-vus`, `ramping-vus`, `shared-iterations`, `per-vu-iterations` ([k6 executors](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/)) |
| Gatling | `injectOpen(...)` with `atOnceUsers(nbUsers)`, `rampUsers(nbUsers).during(duration)`, `constantUsersPerSec(rate).during(duration)`, `rampUsersPerSec(rate1).to(rate2).during(duration)`, `stressPeakUsers(nbUsers).during(duration)` | `injectClosed(...)` with `constantConcurrentUsers(nbUsers).during(duration)`, `rampConcurrentUsers(fromNbUsers).to(toNbUsers).during(duration)` ([Gatling injection](https://docs.gatling.io/concepts/injection/)) |
| Artillery | `arrivalRate` (new VUs per second), `rampTo`, `arrivalCount` ([Artillery test script](https://www.artillery.io/docs/reference/test-script)) | not the native model |
| JMeter | not the native model | Thread Group: a thread count, a ramp-up period, and a loop count, where "Each thread will execute the test plan in its entirety and completely independently of other test threads" ([JMeter test plan](https://jmeter.apache.org/usermanual/test_plan.html)) |
| Locust | approximated with `constant_throughput` wait time, "an adaptive time that ensures the task runs (at most) X times per second" ([Locust locustfile](https://docs.locust.io/en/stable/writing-a-locustfile.html)) | the default: a fixed user count plus `wait_time` |

## The Gatling trap, spelled out

`rampUsers(n).during(d)` and `atOnceUsers(n)` are **open** model profiles despite
the word "users": they inject `n` users *into* the system over the window and
never cap how many are inside at once. The closed equivalents are the ones with
"Concurrent" in the name, `constantConcurrentUsers` and `rampConcurrentUsers`,
and they live under `injectClosed`
([Gatling injection](https://docs.gatling.io/concepts/injection/)). The two
families cannot be mixed in one injection profile.
