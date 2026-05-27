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

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
