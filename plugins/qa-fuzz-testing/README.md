# qa-fuzz-testing

Structure-aware coverage-guided fuzzing: 2 reference skills (corpus-management-reference, sanitiser-integration-reference) + 7 per-language fuzzer skills (libfuzzer-cpp, afl-plus-plus, go-native-fuzzing, cargo-fuzz-rust, atheris-python-fuzzing, jazzer-jvm-fuzzing, ossfuzz-integration) + 1 dispatcher skill (fuzz-toolkit-dispatcher) + 1 agent (fuzz-target-author). Distinct from qa-property-based (hypothesis-driven + shrinking) and qa-api-testing/schemathesis-fuzzing (API-layer); this is binary/system-level coverage-guided fuzzing.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| (filled in as components are added) | | | |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-fuzz-testing@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
