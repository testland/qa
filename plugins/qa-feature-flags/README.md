# qa-feature-flags

Feature-flag platform testing: LaunchDarkly SDK tests, the OpenFeature SDK umbrella (with Unleash / Flagsmith / GrowthBook vendor references), the feature-flag test matrix reference (coverage-suite building + kill-switch test categories), and two agents: flag-coverage-gap detection and stale-flag detection with the removal runbook. Distinct from qa-test-environment/feature-flag-test-harness (generic flag-aware test harness) and qa-shift-right/feature-flag-experiment-validator (validates experiment results); this plugin scopes to platform-SDK testing + flag-lifecycle hygiene.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [launchdarkly-testing](skills/launchdarkly-testing/SKILL.md) | Wraps LaunchDarkly server-side SDK testing patterns: TestData data source for hermetic tests (no network), file-based data source for fix... |
| Skill | [openfeature-sdk-testing](skills/openfeature-sdk-testing/SKILL.md) | OpenFeature (CNCF vendor-neutral) SDK testing umbrella: InMemoryProvider hermetic tests, EvaluationDetails assertions, hooks; plus Unleash / Flagsmith / GrowthBook vendor references. |
| Skill | [feature-flag-test-matrix-reference](skills/feature-flag-test-matrix-reference/SKILL.md) | Flag-state combinatorics + coverage strategies, the coverage-suite building workflow, and kill-switch test categories (references/killswitch.md). |
| Agent | [flag-coverage-gap-detector](agents/flag-coverage-gap-detector.md) | Read-only adversarial critic that scans code for flag-evaluation call sites (isEnabled / getBooleanValue / variation / variationDetail) a... |
| Agent | [stale-flag-detector](agents/stale-flag-detector.md) | Read-only specialist that ranks stale feature flags for removal and attaches the safe-removal runbook (verification, code + platform removal, rollback). |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-feature-flags@testland-qa
```
