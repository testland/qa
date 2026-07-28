# Gatling anti-patterns

Common Gatling simulation mistakes and their fixes. Each one produces numbers
that either fail to model production or corrupt the metrics outright.

| Anti-pattern                                                  | Why it fails                                                    | Fix |
|---------------------------------------------------------------|------------------------------------------------------------------|-----|
| Using `injectClosed` for an open-traffic API                   | Models the wrong system; results don't predict prod behavior.   | Match the workload model: open API -> `injectOpen`; session-bound -> `injectClosed`. |
| Hardcoded URLs / tokens in the Simulation                      | Tests bind to one environment.                                   | `System.getenv("API_BASE_URL")` + `System.getenv("API_TOKEN")`. |
| Missing `pause()` between requests                             | Hammering at full rate doesn't model real users.                | `pause(1)` or `pause(Duration.ofSeconds(1), Duration.ofSeconds(3))` for randomized think time. |
| Asserting only `failedRequests`                                | A 30-second response that succeeds passes the gate but breaks UX. | Always pair with percentile latency assertions. |
| Open-workload with `rampUsersPerSec(0).to(1000)` over 10s      | Synthetic spike; not realistic; client-side bottlenecks corrupt metrics. | Realistic warm-up then sustained load; spike tests are a separate scenario. |
| Saving auth-token discovery inside the scenario                | Each VU re-authenticates on every iteration; auth endpoint becomes the bottleneck. | Authenticate once in `before { ... }` block; share the token across the whole simulation. |
