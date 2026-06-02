# qa-feature-flags

Feature-flag platform testing: SDK-specific tests for LaunchDarkly, Unleash, Flagsmith, GrowthBook; feature-flag test matrix reference; flag-state coverage builder; flag-removal runbook author; stale-flag detector. Distinct from qa-test-environment/feature-flag-test-harness (generic flag-aware test harness) and qa-shift-right/feature-flag-experiment-validator (validates experiment results); this plugin scopes to platform-SDK testing + flag-lifecycle hygiene.

## Components

| Type | Name | Description |
| --- | --- | --- |
| (filled in as components are added) |  |  |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-feature-flags@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
