# qa-fuzz-testing

Structure-aware coverage-guided fuzzing: the `coverage-guided-fuzzing` umbrella skill (fuzzer choice + engine-generic workflow, with libFuzzer, AFL++, cargo-fuzz, Go native, Atheris, Jazzer, corpus-management, sanitizer-integration and crash triage (per-crash reading and the bulk BLOCK/PASS triage workflow) as references) + 1 agent (fuzz-target-author). Distinct from qa-property-based (hypothesis-driven + shrinking) and qa-api-testing/schemathesis-fuzzing (API-layer); this is binary/system-level coverage-guided fuzzing.

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | [coverage-guided-fuzzing](skills/coverage-guided-fuzzing/SKILL.md) | Fuzzer-choice routing tree + engine-generic workflow (target, corpus, sanitizers, CI); per-engine depth (libFuzzer, AFL++, cargo-fuzz, Go native, Atheris, Jazzer) plus corpus-management, sanitizer-integration and crash-triage catalogs as references |
| agent | [fuzz-target-author](agents/fuzz-target-author.md) | Scaffold a fuzz target from a function signature (routed via the umbrella's routing tree) |

## Differentiation

This plugin scopes **structure-aware coverage-guided fuzzing** at
the binary / system level. Sibling neighbours:

- [`qa-property-based`](../qa-property-based/) - hypothesis-driven
  property-based testing with shrinking (Hypothesis, fast-check,
  proptest, jqwik, quickcheck). Different methodology: PBT
  generates from specifications; fuzzing follows coverage
  feedback.
- [`qa-api-testing`](../qa-api-testing/) - has `schemathesis-fuzzing`
  (schema-driven API fuzzing) and `restler-fuzzing` (stateful API
  sequences). API-layer; this plugin is binary/system-level.
- [`qa-security-scanning`](../qa-security-scanning/) - static /
  dynamic security analysis (SAST / DAST) without coverage-guided
  mutation.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-fuzz-testing@testland-qa
```
