# qa-fuzz-testing

Structure-aware coverage-guided fuzzing: the `coverage-guided-fuzzing` umbrella skill (fuzzer choice + engine-generic workflow, with libFuzzer, AFL++, cargo-fuzz, Go native, Atheris, Jazzer, corpus-management, and sanitizer-integration as references) + `crash-triage-reference` (per-crash reading and the bulk BLOCK/PASS triage workflow) + 1 agent (fuzz-target-author). Distinct from qa-property-based (hypothesis-driven + shrinking) and qa-api-testing/schemathesis-fuzzing (API-layer); this is binary/system-level coverage-guided fuzzing.

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | [coverage-guided-fuzzing](skills/coverage-guided-fuzzing/SKILL.md) | Fuzzer-choice routing tree + engine-generic workflow (target, corpus, sanitizers, CI); per-engine depth (libFuzzer, AFL++, cargo-fuzz, Go native, Atheris, Jazzer) plus corpus-management and sanitizer-integration catalogs as references |
| Skill | [crash-triage-reference](skills/crash-triage-reference/SKILL.md) | Triaging fuzzer crashes: ASan/UBSan/MSan reading, exploitability classification, stack-hash dedup, minimization, and the bulk triage workflow ending in a BLOCK/PASS verdict |
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
