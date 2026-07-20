# qa-fuzz-testing

Structure-aware coverage-guided fuzzing: 2 reference skills (corpus-management-reference, sanitiser-integration-reference) + 7 per-language fuzzer skills (libfuzzer-cpp, afl-plus-plus, go-native-fuzzing, cargo-fuzz-rust, atheris-python-fuzzing, jazzer-jvm-fuzzing, ossfuzz-integration) + 1 dispatcher skill (fuzz-tool-selector) + 1 agent (fuzz-target-author). Distinct from qa-property-based (hypothesis-driven + shrinking) and qa-api-testing/schemathesis-fuzzing (API-layer); this is binary/system-level coverage-guided fuzzing.

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | [corpus-management-reference](skills/corpus-management-reference/SKILL.md) | Seed / evolved corpus + crash-artefact naming + dictionary discipline |
| skill | [sanitiser-integration-reference](skills/sanitiser-integration-reference/SKILL.md) | ASan / UBSan / MSan / TSan / LSan composition + compatibility matrix |
| skill | [libfuzzer-cpp](skills/libfuzzer-cpp/SKILL.md) | LLVM libFuzzer for C/C++ (in-process) |
| skill | [afl-plus-plus](skills/afl-plus-plus/SKILL.md) | AFL++ out-of-process fuzzer (file-driven, QEMU mode) |
| skill | [go-native-fuzzing](skills/go-native-fuzzing/SKILL.md) | Go 1.18+ native `go test -fuzz` |
| skill | [cargo-fuzz-rust](skills/cargo-fuzz-rust/SKILL.md) | Rust cargo-fuzz (libFuzzer + Arbitrary trait) |
| skill | [atheris-python-fuzzing](skills/atheris-python-fuzzing/SKILL.md) | Google Atheris (libFuzzer for Python + CPython extensions) |
| skill | [jazzer-jvm-fuzzing](skills/jazzer-jvm-fuzzing/SKILL.md) | Code Intelligence Jazzer (JVM + JUnit 5 + JVM sanitisers) |
| skill | [ossfuzz-integration](skills/ossfuzz-integration/SKILL.md) | Onboard to Google OSS-Fuzz continuous fuzzing service |
| skill | [fuzz-tool-selector](skills/fuzz-tool-selector/SKILL.md) | Decision tree routing fuzz-target authoring per language |
| agent | [fuzz-target-author](agents/fuzz-target-author.md) | Scaffold a fuzz target from a function signature (routed via dispatcher) |
| agent | [fuzz-findings-critic](agents/fuzz-findings-critic.md) | Classify, deduplicate, and verdict crash artifacts from a fuzz campaign (ASan / UBSan / timeout / OOM) |
| Skill | [crash-triage-reference](skills/crash-triage-reference/SKILL.md) | Pure reference: triaging fuzzer crashes (exploitability classification, stack-hash dedup, minimization). |

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
- [`qa-sast`](../qa-sast/) / [`qa-dast`](../qa-dast/) - static /
  dynamic security analysis without coverage-guided mutation.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-fuzz-testing@testland-qa
```
