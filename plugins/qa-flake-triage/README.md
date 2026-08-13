# qa-flake-triage

Flake triage workflow: bisector, parallel-isolation checker, regression bisector, AI-pattern flake detector, trend reporter, and quarantine workflow.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [flaky-test-quarantine](skills/flaky-test-quarantine/SKILL.md) | Quarantine workflow: mark, annotate (rate + bisect link + expiry), auto-expiry report, two-renewal cap. |
| Skill | [flake-pattern-reference](skills/flake-pattern-reference/SKILL.md) | Reference catalog of 8 flake patterns (timing, ordering, shared state, leaks, network, locator, environment, randomness) with detection signals + remediation. |
| Agent | [e2e-flake-bisector](agents/e2e-flake-bisector.md) | Vary one axis at a time (worker count, random order, network throttle, viewport, animations, OS, sequential reps) over N runs to localize the flake source. |
| Agent | [parallel-isolation-checker](agents/parallel-isolation-checker.md) | Find shared state two workers collide on: DB row, schema, file path, port, env-var, module singleton, browser context - with file:line evidence. |
| Agent | [regression-bisector](agents/regression-bisector.md) | `git bisect run` orchestrator: build the test script, mark good/bad, handle exit-125 skips, report the introducing commit. |
| Agent | [e2e-test-trend-reporter](agents/e2e-test-trend-reporter.md) | Weekly / monthly suite health report with week-over-week deltas (pass rate, flakiness rate, top failures, time-to-green, quarantine count). |
| Skill | [flake-dashboard-author](skills/flake-dashboard-author/SKILL.md) | Build a persistent flakiness dashboard from run history (Grafana / Datadog CI Visibility). |
| Skill | [flake-remediation-guide](skills/flake-remediation-guide/SKILL.md) | Per-pattern code fixes for each flake class cataloged in flake-pattern-reference. |
| Skill | [flake-axis-bisection](skills/flake-axis-bisection/SKILL.md) | Finds which condition a flaky test depends on by varying one axis at a time, with confidence intervals on the measured rate and a rule for when a difference exceeds sampling noise. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-flake-triage@testland-qa
```
