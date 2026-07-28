# Chaos experiment authoring reference

Supporting detail for `chaos-experiment-author`. Step 2 uses the event catalog,
Step 7 uses the verdict report template, and the anti-patterns table lists the
mistakes each step guards against.

## Real-world event catalog (Step 2)

Per [principlesofchaos.org][cp] principle 2, vary real-world events: inject what
could plausibly happen, not "anything". Pick events the team has already seen in
real incidents or realistically expects.

| Event class      | Examples                                                    |
|------------------|-------------------------------------------------------------|
| Network          | Latency 500ms, packet loss 5%, DNS failure, connection reset |
| Compute          | Pod kill, CPU throttle, OOM kill, node drain                 |
| Storage          | Disk full, slow disk, read failure                          |
| Time             | Clock skew, leap second                                      |
| Region / zone    | Single AZ outage, multi-AZ outage                            |
| Dependency       | Third-party API 500s, rate limit, timeout                    |
| Configuration    | Bad config push, secret rotation failure                     |

## Verdict report template (Step 7)

```markdown
## Chaos experiment verdict - `checkout-network-latency`

**Date:** YYYY-MM-DD   **Duration:** 5 minutes
**Steady-state hypothesis:** checkout_completion_rate >= 95%
**Verdict:** HELD

| Metric                   | Pre-experiment | During experiment | Post |
|--------------------------|----------------|-------------------|------|
| checkout_completion_rate |     97.2%      |       96.8%       | 97.5% |
| p95 latency              |     245ms      |       380ms       | 240ms |

### Observations
- Latency increased as expected (300ms injected).
- Retry logic worked: ~200 retries observed; no user-visible failures.

### Action items
- (none - system behaved as expected)

### Next iteration
- Increase blast radius from 1% to 5% in next month's run.
- Add a longer-duration variant (15 min) to test fatigue.
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Hypothesis as feeling ("system feels stable")                         | Unmeasurable; can't tell if held.                                        | Numeric metric (Step 1). |
| Inject anything; see what breaks                                       | Wastes effort; misses real failure modes.                                | Pick real-world events (Step 2). |
| Production-first experiment without staging                            | Risks user-visible incident on first run.                                | Staging -> canary -> production (Step 6). |
| No abort conditions                                                    | Experiment runs past safety threshold; real incident.                   | Define abort + manual abort signal (Step 3). |
| Manual experiment runs only                                            | Per [principlesofchaos.org][cp]: "labor-intensive and ultimately unsustainable." | Automate (Step 5). |
| One-off experiment then forget                                         | Confidence decays; same incident recurs.                                 | Schedule + repeat (Step 5 cron). |
| Skipping the verdict report                                            | Lessons not captured; next iteration arbitrary.                          | Step 7 report. |

[cp]: https://principlesofchaos.org/
