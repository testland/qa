# qa-flake-triage

Flake triage workflow: axis bisector with shared-state isolation checking, regression bisector (pass/fail and perf-measurement modes), flake pattern catalog with per-pattern code fixes, dashboards with periodic trend reports, and the quarantine workflow.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [flaky-test-quarantine](skills/flaky-test-quarantine/SKILL.md) | Quarantine workflow: mark, annotate (rate + bisect link + expiry), auto-expiry report, two-renewal cap. |
| Skill | [flake-pattern-reference](skills/flake-pattern-reference/SKILL.md) | Catalog of 8 flake patterns (timing, ordering, shared state, leaks, network, locator, environment, randomness) with detection signals, remediation, and per-pattern code fixes in references. |
| Skill | [flake-dashboard-author](skills/flake-dashboard-author/SKILL.md) | Build a persistent flakiness dashboard from run history (Grafana / Datadog CI Visibility), plus the weekly / monthly trend report with week-over-week deltas. |
| Skill | [flake-axis-bisection](skills/flake-axis-bisection/SKILL.md) | Finds which condition a flaky test depends on by varying one axis at a time, with confidence intervals on the measured rate and a rule for when a difference exceeds sampling noise. |
| Agent | [e2e-flake-bisector](agents/e2e-flake-bisector.md) | Vary one axis at a time (worker count, random order, network throttle, viewport, animations, OS, sequential reps) over N runs to localize the flake source; when parallelism is implicated, stage 2 finds the shared state two workers collide on with file:line evidence. |
| Agent | [regression-bisector](agents/regression-bisector.md) | `git bisect run` orchestrator: build the test script, mark good/bad, handle exit-125 skips, report the introducing commit; perf-measurement mode bisects on a k6 / Lighthouse budget instead of pass/fail. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-flake-triage@testland-qa
```
