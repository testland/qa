# qa-shift-right

Production-side QA per ISTQB-canonical shift right ("a test approach to test a system continuously in production"). Closes the production-observability-testing gap (Tier 2, 0 hits in corpus). Synthetic monitors that exercise critical journeys, canary-deploy validators with statistical comparison vs baseline, A/B / feature-flag experiment significance validators, and the loop from production-side incident → regression test added.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [synthetic-monitor-author](skills/synthetic-monitor-author/SKILL.md) | S3 | Build-an-X synthetic monitor: pick journey + platform (Datadog/Checkly/Pingdom/etc.) + Playwright-style script + per-step assertions + multi-region cadence + alert thresholds. |
| skill | [prod-canary-validator](skills/prod-canary-validator/SKILL.md) | S3 | Build-an-X canary verdict: per-metric absolute + relative thresholds, two-sample statistical tests (chi-square / Welch's t-test), promote/pause/rollback verdict. |
| skill | [feature-flag-experiment-validator](skills/feature-flag-experiment-validator/SKILL.md) | S3 | Build-an-X A/B test analysis: chi-square / Welch's / Mann-Whitney U per metric, FDR multiple-comparisons correction, practical-vs-statistical significance, ship/don't-ship verdict. |
| agent | [production-tester](agents/production-tester.md) | A2 | Authors a synthetic monitor for one critical journey end-to-end: script + config + PR with review checklist; refuses real-data / real-payment monitors. |
| agent | [observability-to-test](agents/observability-to-test.md) | A2 | Closes the loop: production-signal → regression test (cheapest catching layer per test pyramid) + fix PR + postmortem update. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-shift-right@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
