# qa-flake-triage

Flake triage workflow: bisector, parallel-isolation checker, regression bisector, AI-pattern flake detector, trend reporter, and quarantine workflow.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [flaky-test-quarantine](skills/flaky-test-quarantine/SKILL.md) | S3 | Quarantine workflow: mark, annotate (rate + bisect link + expiry), auto-expiry report, two-renewal cap. |
| skill | [flake-pattern-reference](skills/flake-pattern-reference/SKILL.md) | S2 | Reference catalog of 8 flake patterns (timing, ordering, shared state, leaks, network, locator, environment, randomness) with detection signals + remediation. |
| agent | [e2e-flake-bisector](agents/e2e-flake-bisector.md) | A1 | Vary one axis at a time (worker count, random order, network throttle, viewport, animations, OS, sequential reps) over N runs to localize the flake source. |
| agent | [parallel-isolation-checker](agents/parallel-isolation-checker.md) | A1 | Find shared state two workers collide on: DB row, schema, file path, port, env-var, module singleton, browser context — with file:line evidence. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-flake-triage@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
