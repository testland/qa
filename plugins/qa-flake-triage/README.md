# qa-flake-triage

Flake triage workflow: bisector, parallel-isolation checker, regression bisector, AI-pattern flake detector, trend reporter, and quarantine workflow.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [flaky-test-quarantine](skills/flaky-test-quarantine/SKILL.md) | S3 | Quarantine workflow: mark, annotate (rate + bisect link + expiry), auto-expiry report, two-renewal cap. |
| Skill | [flake-pattern-reference](skills/flake-pattern-reference/SKILL.md) | S2 | Reference catalog of 8 flake patterns (timing, ordering, shared state, leaks, network, locator, environment, randomness) with detection signals + remediation. |
| Agent | [e2e-flake-bisector](agents/e2e-flake-bisector.md) | A1 | Vary one axis at a time (worker count, random order, network throttle, viewport, animations, OS, sequential reps) over N runs to localize the flake source. |
| Agent | [parallel-isolation-checker](agents/parallel-isolation-checker.md) | A1 | Find shared state two workers collide on: DB row, schema, file path, port, env-var, module singleton, browser context — with file:line evidence. |
| Agent | [regression-bisector](agents/regression-bisector.md) | A1 | `git bisect run` orchestrator: build the test script, mark good/bad, handle exit-125 skips, report the introducing commit. |
| Agent | [ai-flake-detector](agents/ai-flake-detector.md) | A1 | Predictive screen: ranks currently-green tests by flakiness risk (passing→flaky transitions, duration variance, fixed-sleep patterns, cross-suite ordering). |
| Agent | [e2e-test-trend-reporter](agents/e2e-test-trend-reporter.md) | A1 | Weekly / monthly suite health report with week-over-week deltas (pass rate, flakiness rate, top failures, time-to-green, quarantine count). |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-flake-triage@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
