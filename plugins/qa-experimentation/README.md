# qa-experimentation

Experimentation harness testing: SDK-specific testing for Statsig, Optimizely, VWO, Amplitude Experiment; sample-ratio-mismatch (SRM) detection; AB-test validity checklist; guardrail-metrics + peeking-problem references. Distinct from qa-shift-right/feature-flag-experiment-validator (validates experiment results); this plugin tests the experimentation harness itself (SDK behaviour, assignment integrity, statistical-validity gates).

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| (filled in as components are added) | | | |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-experimentation@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
