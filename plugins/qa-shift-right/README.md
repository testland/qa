# qa-shift-right

Production-side QA per ISTQB-canonical shift right ("a test approach to test a system continuously in production"). Synthetic monitors that exercise critical journeys, canary-deploy validators with statistical comparison vs baseline, A/B / feature-flag experiment significance validators, and the loop from production-side incident → regression test added.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [synthetic-monitor-author](skills/synthetic-monitor-author/SKILL.md) | Build-an-X synthetic monitor: pick journey + platform (Datadog/Checkly/Pingdom/etc.) + Playwright-style script + per-step assertions + multi-region cadence + alert thresholds. |
| Skill | [prod-canary-validator](skills/prod-canary-validator/SKILL.md) | Build-an-X canary verdict: per-metric absolute + relative thresholds, two-sample statistical tests (chi-square / Welch's t-test), promote/pause/rollback verdict. |
| Skill | [feature-flag-experiment-validator](skills/feature-flag-experiment-validator/SKILL.md) | Build-an-X A/B test analysis: chi-square / Welch's / Mann-Whitney U per metric, FDR multiple-comparisons correction, practical-vs-statistical significance, ship/don't-ship verdict. |
| Agent | [observability-to-test](agents/observability-to-test.md) | Closes the loop: production-signal → regression test (cheapest catching layer per test pyramid) + fix PR + postmortem update. |
| Agent | [canary-and-experiment-coordinator](agents/canary-and-experiment-coordinator.md) | Coordinates a simultaneous canary deploy + A/B experiment, catching cohort contamination and sequencing the validators. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-shift-right@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
