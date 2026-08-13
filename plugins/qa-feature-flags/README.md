# qa-feature-flags

Feature-flag platform testing + experimentation harness testing: LaunchDarkly SDK tests, the OpenFeature SDK umbrella (with Unleash / Flagsmith / GrowthBook vendor references), the feature-flag test matrix reference (coverage-suite building + kill-switch test categories), the experiment-sdk-testing umbrella (Statsig, Optimizely, Split.io, Amplitude Experiment, VWO hermetic harnesses), the AB-test validity checklist, the experiment-results interpreter (peeking + guardrail methodology in its references), and three agents: flag-coverage-gap detection, stale-flag detection with the removal runbook, and sample-ratio-mismatch (SRM) detection. Distinct from qa-test-environment/feature-flag-test-harness (generic flag-aware test harness) and qa-shift-right/feature-flag-experiment-validator (validates production experiment results); this plugin scopes to platform-SDK testing, flag-lifecycle hygiene, and testing the experimentation harness itself.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [launchdarkly-testing](skills/launchdarkly-testing/SKILL.md) | Wraps LaunchDarkly server-side SDK testing patterns: TestData data source for hermetic tests (no network), file-based data source for fix... |
| Skill | [openfeature-sdk-testing](skills/openfeature-sdk-testing/SKILL.md) | OpenFeature (CNCF vendor-neutral) SDK testing umbrella: InMemoryProvider hermetic tests, EvaluationDetails assertions, hooks; plus Unleash / Flagsmith / GrowthBook vendor references. |
| Skill | [feature-flag-test-matrix-reference](skills/feature-flag-test-matrix-reference/SKILL.md) | Flag-state combinatorics + coverage strategies, the coverage-suite building workflow, and kill-switch test categories (references/killswitch.md). |
| Skill | [ab-test-validity-checklist](skills/ab-test-validity-checklist/SKILL.md) | Workflow-driven skill that builds an A/B test validity checklist from an experiment proposal. |
| Skill | [experiment-sdk-testing](skills/experiment-sdk-testing/SKILL.md) | Shared offline-datafile / hermetic-init pattern with per-vendor references for Statsig, Optimizely, Split.io, Amplitude Experiment, and VWO. |
| Skill | [experiment-results-interpreter](skills/experiment-results-interpreter/SKILL.md) | Interprets valid experiment results; peeking-problem and guardrail-metric methodology in references/. |
| Agent | [flag-coverage-gap-detector](agents/flag-coverage-gap-detector.md) | Read-only adversarial critic that scans code for flag-evaluation call sites (isEnabled / getBooleanValue / variation / variationDetail) a... |
| Agent | [stale-flag-detector](agents/stale-flag-detector.md) | Read-only specialist that ranks stale feature flags for removal and attaches the safe-removal runbook (verification, code + platform removal, rollback). |
| Agent | [sample-ratio-mismatch-detector](agents/sample-ratio-mismatch-detector.md) | Read-only specialist that detects Sample Ratio Mismatch (SRM) in an A/B test by running a chi-square test against the observed-vs-expecte... |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-feature-flags@testland-qa
```
