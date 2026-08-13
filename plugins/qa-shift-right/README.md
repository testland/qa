# qa-shift-right

Production-side QA per ISTQB-canonical shift right ("a test approach to test a system continuously in production"). Synthetic monitors that exercise critical journeys, canary-deploy validators with statistical comparison vs baseline, A/B / feature-flag experiment significance validators, and the loop from production-side incident → regression test added.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [synthetic-monitor-author](skills/synthetic-monitor-author/SKILL.md) | Build-an-X synthetic monitor: pick journey + platform (Datadog/Checkly/Pingdom/etc.) + Playwright-style script + per-step assertions + multi-region cadence + alert thresholds. |
| Skill | [prod-canary-validator](skills/prod-canary-validator/SKILL.md) | Build-an-X canary verdict: per-metric absolute + relative thresholds, two-sample statistical tests (chi-square / Welch's t-test), promote/pause/rollback verdict. |
| Skill | [feature-flag-experiment-validator](skills/feature-flag-experiment-validator/SKILL.md) | Build-an-X A/B test analysis: chi-square / Welch's / Mann-Whitney U per metric, FDR multiple-comparisons correction, practical-vs-statistical significance, ship/don't-ship verdict. |
| Agent | [observability-to-test](agents/observability-to-test.md) | Closes the loop: production-signal → regression test (cheapest catching layer per test pyramid) + fix PR + postmortem update. |
| Skill | [rum-to-synthetic-gap-analyzer](skills/rum-to-synthetic-gap-analyzer/SKILL.md) | Finds high-traffic user journeys with no synthetic monitor by analyzing RUM / CrUX data. |
| Skill | [release-runbook-author](skills/release-runbook-author/SKILL.md) | Writes one service's six-phase release runbook (pre-flight, smoke gate, canary observation, human promote gate, rollout, post-release) with each phase gated on a delta against a recorded baseline. |
| Skill | [cutover-sequence-author](skills/cutover-sequence-author/SKILL.md) | Sequences a multi-team cutover into dependency-ordered gates, each with one named owner, a hard timebox, a written rollback trigger, and a reverse-order rollback path. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-shift-right@testland-qa
```
