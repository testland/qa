# qa-experimentation

Experimentation harness testing: SDK-specific testing for Statsig, Optimizely, VWO, Amplitude Experiment; sample-ratio-mismatch (SRM) detection; AB-test validity checklist; guardrail-metrics + peeking-problem references. Distinct from qa-shift-right/feature-flag-experiment-validator (validates experiment results); this plugin tests the experimentation harness itself (SDK behaviour, assignment integrity, statistical-validity gates).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [ab-test-validity-checklist](skills/ab-test-validity-checklist/SKILL.md) | Workflow-driven skill that builds an A/B test validity checklist from an experiment proposal. |
| Skill | [amplitude-experiment-test](skills/amplitude-experiment-test/SKILL.md) | Wraps Amplitude Experiment SDK testing patterns: client initialization with API key (or local-flags JSON), the fetch / variant API, expos... |
| Skill | [experiment-results-interpreter](skills/experiment-results-interpreter/SKILL.md) | Pure-reference catalog for interpreting the results of an online controlled experiment after harness validity is confirmed. |
| Skill | [guardrail-metrics-reference](skills/guardrail-metrics-reference/SKILL.md) | Pure-reference catalog of guardrail-metric methodology for online controlled experiments. |
| Skill | [optimizely-test](skills/optimizely-test/SKILL.md) | Wraps Optimizely Feature Experimentation SDK testing patterns: client initialization with a datafile (offline-friendly), the decide / dec... |
| Skill | [peeking-problem-reference](skills/peeking-problem-reference/SKILL.md) | Pure-reference catalog of the peeking problem in online A/B testing. |
| Skill | [split-io-test](skills/split-io-test/SKILL.md) | Wraps Split.io (Harness FME) SDK testing patterns: hermetic localhost/offline mode with an in-memory features map (JavaScript/browser) or... |
| Skill | [statsig-test](skills/statsig-test/SKILL.md) | Wraps Statsig SDK testing patterns: server-side initialization (statsig.initialize with API key), gate / experiment / dynamic-config eval... |
| Skill | [vwo-test](skills/vwo-test/SKILL.md) | Wraps VWO (Visual Website Optimizer) SDK testing patterns: SDK initialization with the settings file (offline-capable), `getFeatureVariab... |
| Agent | [sample-ratio-mismatch-detector](agents/sample-ratio-mismatch-detector.md) | Read-only specialist that detects Sample Ratio Mismatch (SRM) in an A/B test by running a chi-square test against the observed-vs-expecte... |

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
rubric.
