# qa-shift-right

Production-side QA per ISTQB-canonical shift right ("a test approach to test a system continuously in production"). Synthetic monitors that exercise critical journeys (with RUM-derived coverage gap analysis), canary-deploy validators with statistical comparison vs baseline, A/B / feature-flag experiment significance validators, release runbooks with the multi-team cutover sequence in references, and the loop from production-side incident → regression test added.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [synthetic-monitor-author](skills/synthetic-monitor-author/SKILL.md) | Build-an-X synthetic monitor: pick journey + platform (Datadog/Checkly/Pingdom/etc.) + Playwright-style script + per-step assertions + multi-region cadence + alert thresholds. Includes the RUM-coverage gap method: score real-user journeys from RUM / CrUX data, diff against the monitor inventory, emit a ranked gap list. |
| Skill | [prod-canary-validator](skills/prod-canary-validator/SKILL.md) | Build-an-X canary verdict: per-metric absolute + relative thresholds, two-sample statistical tests (chi-square / Welch's t-test), promote/pause/rollback verdict. |
| Skill | [feature-flag-experiment-validator](skills/feature-flag-experiment-validator/SKILL.md) | Build-an-X A/B test analysis: chi-square / Welch's / Mann-Whitney U per metric, FDR multiple-comparisons correction, practical-vs-statistical significance, ship/don't-ship verdict. |
| Skill | [release-runbook-author](skills/release-runbook-author/SKILL.md) | Writes one service's six-phase release runbook (pre-flight, smoke gate, canary observation, human promote gate, rollout, post-release) with each phase gated on a delta against a recorded baseline. The multi-team cutover sequence (dependency-ordered gates, named owners, timeboxes, reverse-order rollback) lives in references/. |
| Agent | [observability-to-test](agents/observability-to-test.md) | Closes the loop: production-signal → regression test (cheapest catching layer per test pyramid) + fix PR + postmortem update. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-shift-right@testland-qa
```
