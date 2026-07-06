# qa-feature-flags

Feature-flag platform testing: SDK-specific tests for LaunchDarkly, Unleash, Flagsmith, GrowthBook; feature-flag test matrix reference; flag-state coverage builder; flag-removal runbook author; stale-flag detector. Distinct from qa-test-environment/feature-flag-test-harness (generic flag-aware test harness) and qa-shift-right/feature-flag-experiment-validator (validates experiment results); this plugin scopes to platform-SDK testing + flag-lifecycle hygiene.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [feature-flag-test-matrix-reference](skills/feature-flag-test-matrix-reference/SKILL.md) | Pure-reference catalog of feature-flag test matrix design. |
| Skill | [flag-removal-runbook-author](skills/flag-removal-runbook-author/SKILL.md) | Workflow-driven skill that builds the runbook for safely removing a feature flag from the codebase + the flag platform. |
| Skill | [flag-state-coverage-builder](skills/flag-state-coverage-builder/SKILL.md) | Workflow-driven skill that builds a flag-state coverage matrix from the project's flag inventory and risk register. |
| Skill | [flagsmith-testing](skills/flagsmith-testing/SKILL.md) | Wraps Flagsmith server-side SDK testing patterns: local-evaluation mode (no API calls), offline mode with LocalFileHandler + downloaded e... |
| Skill | [growthbook-testing](skills/growthbook-testing/SKILL.md) | Wraps GrowthBook Node SDK testing patterns: GrowthBookClient initialization with direct payload (initSync; no network), isOn / getFeature... |
| Skill | [killswitch-test-author](skills/killswitch-test-author/SKILL.md) | Workflow-driven skill that authors the four test categories specific to kill-switch (ops-toggle) flags: switch-OFF graceful degradation,... |
| Skill | [launchdarkly-testing](skills/launchdarkly-testing/SKILL.md) | Wraps LaunchDarkly server-side SDK testing patterns: TestData data source for hermetic tests (no network), file-based data source for fix... |
| Skill | [openfeature-sdk-testing](skills/openfeature-sdk-testing/SKILL.md) | Wraps OpenFeature (CNCF vendor-neutral SDK abstraction) testing patterns: the InMemoryProvider for hermetic tests without network calls,... |
| Skill | [unleash-testing](skills/unleash-testing/SKILL.md) | Wraps Unleash (Open Source / SaaS) SDK testing patterns: bootstrap with a static toggles array (no network), the test mode (disableMetric... |
| Agent | [flag-coverage-gap-detector](agents/flag-coverage-gap-detector.md) | Read-only adversarial critic that scans code for flag-evaluation call sites (isEnabled / getBooleanValue / variation / variationDetail) a... |
| Agent | [stale-flag-detector](agents/stale-flag-detector.md) | Read-only specialist that scans a codebase for stale feature flags - flags at 100% rollout for long enough to remove, kill-switches that... |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-feature-flags@testland-qa
```
