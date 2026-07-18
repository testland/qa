---
name: fuzz-toolkit-dispatcher
description: "Toolkit / dispatcher skill that routes a fuzz-target authoring task to the correct per-language fuzzer skill based on detected language. Decision tree: C/C++ → libfuzzer-cpp + afl-plus-plus; Rust → cargo-fuzz-rust (or libfuzzer-cpp via FFI); Go → go-native-fuzzing; Python → atheris-python-fuzzing; JVM → jazzer-jvm-fuzzing; closed-source binary → afl-plus-plus in QEMU mode; mature open-source project → ossfuzz-integration. Composes with corpus-management-reference + sanitiser-integration-reference. Use when routing a fuzz-target authoring task to the right per-language fuzzer."
---

# fuzz-toolkit-dispatcher

## Overview

Decision tree routing a fuzz-target authoring task to the right
per-language fuzzer skill. Composes the seven per-language
skills + the two references in the plugin. Picks based on
target language, source-availability, and OSS-Fuzz eligibility.

## When to use

- Authoring a fuzz target - pick the right fuzzer before writing
  the harness.
- Reviewing an existing fuzz target - verify the right fuzzer was
  selected.

## Decision tree

```
Step 1: Identify target language(s).
        ↓
+-------+----------+--------+--------+-------+--------+--------+
| C/C++ |   Rust   |   Go   | Python |  JVM  | Other  | Binary |
|       |          |        |        |       |        | (no    |
|       |          |        |        |       |        | source)|
+-------+----------+--------+--------+-------+--------+--------+
    ↓        ↓         ↓        ↓        ↓        ↓        ↓
  Step 2:                                            AFL++
  Library    cargo-    go test  Atheris  Jazzer    Choose    -Q mode
  function?   fuzz     -fuzz                       per LLVM
   YES                                              -fsanitize
    ↓                                                support
  libFuzzer
  (in-process)
   OR
  AFL++ (file-driven)

Step 3: Is this a mature open-source project?
        ↓
        YES → also submit to OSS-Fuzz
                                            ↓
                                          ossfuzz-integration
```

## Routing rules

| Target characteristic | Route to |
|---|---|
| C / C++ library with callable function API | [`libfuzzer-cpp`](../libfuzzer-cpp/SKILL.md) |
| C / C++ binary processing files | [`afl-plus-plus`](../afl-plus-plus/SKILL.md) |
| C / C++ source unavailable | [`afl-plus-plus`](../afl-plus-plus/SKILL.md) (`-Q` QEMU) |
| Rust crate | [`cargo-fuzz-rust`](../cargo-fuzz-rust/SKILL.md) |
| Rust binary processing files | [`afl-plus-plus`](../afl-plus-plus/SKILL.md) |
| Go package | [`go-native-fuzzing`](../go-native-fuzzing/SKILL.md) |
| Pure Python or CPython native extension | [`atheris-python-fuzzing`](../atheris-python-fuzzing/SKILL.md) |
| Java / Kotlin / Scala / Groovy library | [`jazzer-jvm-fuzzing`](../jazzer-jvm-fuzzing/SKILL.md) |
| Swift library | [`libfuzzer-cpp`](../libfuzzer-cpp/SKILL.md) (Swift wraps libFuzzer natively) |
| Mature open-source project (any of the above languages) | Also: [`ossfuzz-integration`](../ossfuzz-integration/SKILL.md) (continuous 24x7 campaign) |

## Routing rationale

### C/C++

Prefer **libFuzzer** for callable APIs (parsers, validators,
decoders). In-process iteration is fastest. Pair with ASan + UBSan
per [`sanitiser-integration-reference`](../sanitiser-integration-reference/SKILL.md).

Switch to **AFL++** when:

- The target reads input via stdin or file argument (file-format
  tools, command-line utilities)
- You need QEMU mode for closed-source binaries
- You want a different mutation engine - AFL++ and libFuzzer find
  different bugs

Many mature projects run **both** libFuzzer and AFL++ targets in
parallel.

### Rust

Prefer **cargo-fuzz** - integrates with cargo, supports
`Arbitrary` for structured input. Requires nightly toolchain.

For Rust binaries (not callable library APIs), AFL++ works
similarly to C/C++ - wrap the binary with AFL++.

### Go

Use **Go native fuzzing** - built into the standard `testing`
package as of Go 1.18. Failing inputs auto-save as regression
fixtures.

For binary-level Go fuzzing or fuzzing CGo dependencies, AFL++ in
`-Q` mode works.

### Python

Use **Atheris** - Google's libFuzzer-backed Python fuzzer.
Supports both pure-Python and CPython native extensions.

For pure property-based testing in Python (without coverage
guidance), consider Hypothesis in the `hypothesis-testing` skill
(qa-property-based plugin) - complementary, not competing.

### JVM

Use **Jazzer** - Code Intelligence's libFuzzer-backed JVM
fuzzer. JUnit 5 integration via `@FuzzTest`. Ships JVM-level
sanitisers (deserialization, SSRF, ReDoS, OS command injection).

### Other languages

Languages with libFuzzer-compatible sanitiser-coverage support
(Swift, Objective-C, some Haskell setups): use libFuzzer
directly via the language's FFI / wrapper.

Languages without native fuzzer support (e.g., Erlang, OCaml):
test via AFL++ on the compiled binary.

### OSS-Fuzz overlay

Independent of the per-language choice: if the project is
open-source, mature, and security-relevant, also onboard to
[`ossfuzz-integration`](../ossfuzz-integration/SKILL.md).
OSS-Fuzz runs the existing libFuzzer / AFL++ / Jazzer harness 24x7
on Google infrastructure with automatic crash reports.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Picking AFL++ for a callable C/C++ library API | Out-of-process overhead 10-100x | Use libFuzzer for in-process |
| Picking libFuzzer for a file-processing binary | Adapter glue is complex; AFL++ handles `@@` cleanly | Use AFL++ |
| Picking cargo-fuzz on stable Rust | Won't compile | Use nightly toolchain |
| Skipping OSS-Fuzz for a mature open-source project | Misses continuous 24x7 fuzzing | Submit alongside in-house CI fuzz |
| Mixing fuzzer outputs without considering corpus format | libFuzzer / AFL++ corpora aren't directly compatible | Use one fuzzer's corpus; convert if needed |
| Routing based on language alone, ignoring "source available" | Closed-source need QEMU regardless of source language | Always factor in availability |

## Limitations

- **Doesn't replace per-language expertise.** Knowing libFuzzer's
  flags vs AFL++'s requires reading the linked skill.
- **Doesn't handle cross-language targets.** A JNI library: Java
  side via Jazzer, C side via libFuzzer; two separate campaigns.
- **OSS-Fuzz eligibility heuristic.** "Mature open-source" is
  judgemental; OSS-Fuzz acceptance committee has the final say.

## References

- Composes per-language skills:
  [`libfuzzer-cpp`](../libfuzzer-cpp/SKILL.md),
  [`afl-plus-plus`](../afl-plus-plus/SKILL.md),
  [`go-native-fuzzing`](../go-native-fuzzing/SKILL.md),
  [`cargo-fuzz-rust`](../cargo-fuzz-rust/SKILL.md),
  [`atheris-python-fuzzing`](../atheris-python-fuzzing/SKILL.md),
  [`jazzer-jvm-fuzzing`](../jazzer-jvm-fuzzing/SKILL.md),
  [`ossfuzz-integration`](../ossfuzz-integration/SKILL.md).
- Composes references:
  [`corpus-management-reference`](../corpus-management-reference/SKILL.md),
  [`sanitiser-integration-reference`](../sanitiser-integration-reference/SKILL.md).
