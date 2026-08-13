# qa-experimentation

Experimentation harness testing: the experiment-sdk-testing umbrella (Statsig, Optimizely, Split.io, Amplitude Experiment, VWO hermetic harnesses), the AB-test validity checklist, the experiment-results interpreter (with peeking + guardrail methodology in its references), and sample-ratio-mismatch (SRM) detection. Distinct from qa-shift-right/feature-flag-experiment-validator (validates experiment results); this plugin tests the experimentation harness itself (SDK behaviour, assignment integrity, statistical-validity gates).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [ab-test-validity-checklist](skills/ab-test-validity-checklist/SKILL.md) | Workflow-driven skill that builds an A/B test validity checklist from an experiment proposal. |
| Skill | [experiment-sdk-testing](skills/experiment-sdk-testing/SKILL.md) | Shared offline-datafile / hermetic-init pattern with per-vendor references for Statsig, Optimizely, Split.io, Amplitude Experiment, and VWO. |
| Skill | [experiment-results-interpreter](skills/experiment-results-interpreter/SKILL.md) | Interprets valid experiment results; peeking-problem and guardrail-metric methodology in references/. |
| Agent | [sample-ratio-mismatch-detector](agents/sample-ratio-mismatch-detector.md) | Read-only specialist that detects Sample Ratio Mismatch (SRM) in an A/B test by running a chi-square test against the observed-vs-expecte... |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-experimentation@testland-qa
```
