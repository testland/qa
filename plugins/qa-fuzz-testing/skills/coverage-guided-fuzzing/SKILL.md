---
name: coverage-guided-fuzzing
description: "Coverage-guided fuzzing across every mainstream engine - libFuzzer (C/C++ in-process), AFL++ (out-of-process, QEMU mode for closed-source binaries), cargo-fuzz (Rust), Go native fuzzing (go test -fuzz), Atheris (Python), and Jazzer (JVM, @FuzzTest). Body covers choosing the right fuzzer for the language and build type (the routing tree) plus the engine-generic workflow: writing a small deterministic fuzz target, seed-corpus + dictionary construction, sanitizer selection (ASan + UBSan default, compatibility matrix), corpus minimisation, crash-artifact handling, and CI smoke-fuzz wiring with a cached corpus. Per-engine depth (flags, harness syntax, CI jobs) lives in references, as do the corpus-management and sanitizer-integration catalogs. Use when a project needs fuzz coverage and no fuzzer is chosen yet, or when authoring / running / maintaining a fuzz campaign with any of these engines. For triaging the resulting crashes see crash-triage-reference."
---

# coverage-guided-fuzzing

## Overview

Coverage-guided fuzzers mutate inputs, watch which code paths each input
reaches, and keep mutating the inputs that find new coverage. Every
mainstream engine implements the same loop; they differ in language,
process model, and toolchain integration. This umbrella covers choosing
the engine, the engine-generic workflow (target → corpus → sanitizers →
CI), and links the per-engine references that carry exact flags and
harness syntax.

| Engine | Language / niche | Reference |
|---|---|---|
| libFuzzer | C/C++ callable APIs, in-process (also Swift) | [references/libfuzzer.md](references/libfuzzer.md) |
| AFL++ | File/stdin-driven binaries, closed-source via QEMU | [references/afl-plus-plus.md](references/afl-plus-plus.md) |
| cargo-fuzz | Rust crates (libFuzzer + cargo, nightly) | [references/cargo-fuzz.md](references/cargo-fuzz.md) |
| Go native | Go packages (`go test -fuzz`, Go 1.18+) | [references/go-native-fuzzing.md](references/go-native-fuzzing.md) |
| Atheris | Python libraries + CPython extensions | [references/atheris.md](references/atheris.md) |
| Jazzer | Java / Kotlin / Scala / Groovy (`@FuzzTest`) | [references/jazzer.md](references/jazzer.md) |

Shared catalogs:
[references/corpus-management.md](references/corpus-management.md)
(seed / evolved corpus, dictionaries, minimisation) and
[references/sanitizer-integration.md](references/sanitizer-integration.md)
(ASan / UBSan / MSan / TSan / LSan flags + compatibility).

## When to use

- A project needs coverage-guided fuzzing and no fuzzer has been chosen
  for its language or toolchain yet (routing below).
- Authoring a fuzz target, bootstrapping its corpus, or picking
  sanitizers for it.
- Running or maintaining a fuzz campaign - local, CI smoke, or
  long-running.
- Reviewing an existing fuzz target - verify the right engine was
  selected.

## Choosing your fuzzer

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
```

| Target characteristic | Route to |
|---|---|
| C / C++ library with callable function API | libFuzzer |
| C / C++ binary processing files | AFL++ |
| C / C++ source unavailable | AFL++ (`-Q` QEMU) |
| Rust crate | cargo-fuzz |
| Rust binary processing files | AFL++ |
| Go package | Go native fuzzing |
| Pure Python or CPython native extension | Atheris |
| Java / Kotlin / Scala / Groovy library | Jazzer |
| Swift library | libFuzzer (Swift wraps libFuzzer natively) |

Routing rationale:

- **C/C++**: prefer libFuzzer for callable APIs (parsers, validators,
  decoders) - in-process iteration is 10-100x faster. Switch to AFL++
  when the target reads stdin/file input, when you need QEMU mode for
  closed-source binaries, or as a second mutation engine (AFL++ and
  libFuzzer find different bugs); mature projects run both.
- **Rust**: cargo-fuzz integrates with cargo and supports `Arbitrary`
  for structured input; requires nightly. Rust binaries (not callable
  APIs) → AFL++.
- **Go**: native fuzzing is built into `testing` (Go 1.18+); failing
  inputs auto-save as regression fixtures. CGo dependencies → AFL++ `-Q`.
- **Python**: Atheris (Google's libFuzzer-backed fuzzer) covers pure
  Python and CPython extensions. For property-based testing without
  coverage guidance, Hypothesis (`hypothesis-testing`, qa-property-based
  plugin) is complementary, not competing.
- **JVM**: Jazzer integrates with JUnit 5 via `@FuzzTest` and ships
  JVM-level sanitizers (deserialization, SSRF, ReDoS, command injection).
- **Other languages**: with libFuzzer-compatible sanitizer-coverage
  support (Swift, Objective-C) use libFuzzer via FFI; without it
  (Erlang, OCaml), fuzz the compiled binary with AFL++.
- **OSS overlay**: mature, security-relevant open-source projects can
  additionally onboard to OSS-Fuzz
  ([google.github.io/oss-fuzz](https://google.github.io/oss-fuzz/)) -
  it runs existing libFuzzer / AFL++ / Jazzer harnesses 24x7.

## The engine-generic workflow

### Step 1 - Write a small, deterministic fuzz target

Every engine calls your target repeatedly with mutated bytes (or typed
values). The rules are engine-independent:

- Keep the target small - one function / one format per target; faster
  iteration, clearer coverage attribution.
- No global state between runs - cross-input contamination defeats
  coverage guidance.
- Use the full input; don't gate on arbitrary size checks.
- No I/O or network in the hot path.
- For multi-parameter targets use the engine's structured-input helper:
  `FuzzedDataProvider` (libFuzzer / Atheris / Jazzer), `Arbitrary`
  (cargo-fuzz), typed `f.Fuzz` parameters (Go).

Exact harness syntax per engine is in the reference files.

### Step 2 - Seed corpus + dictionary

Bootstrap with 5-50 hand-curated diverse inputs (from spec keywords,
test fixtures, or PII-scrubbed production samples) and, for structured
formats (JSON / XML / SQL / protobuf), a dictionary of grammar tokens -
without one the fuzzer slowly rediscovers the grammar. Keep seeds
versioned and read-only; let the evolved corpus live in the output
directory (CI cache, not the repo). Construction strategies, per-engine
directory layouts, and minimisation cadence:
[references/corpus-management.md](references/corpus-management.md).

### Step 3 - Sanitizers

A fuzzer without sanitizers catches only hard crashes - 80%+ of memory
bugs are silent without them. Defaults per language:

- C/C++ / Rust: ASan + UBSan in one binary
  (`-fsanitize=fuzzer,address,undefined -fno-sanitize-recover=all`);
  MSan needs a separate whole-program-instrumented binary.
- Go: the race detector (`go test -race`) is the TSan-equivalent.
- JVM: Jazzer's JVM-level sanitizers are on by default.
- Python: attach ASan to the interpreter only when fuzzing native
  extensions.

Compatibility matrix, build flags, `ASAN_OPTIONS` / `UBSAN_OPTIONS`, and
report anatomy:
[references/sanitizer-integration.md](references/sanitizer-integration.md).

### Step 4 - Run, minimise, repeat

Run locally until coverage plateaus; minimise the corpus periodically
(`-merge=1` / `afl-cmin`) so cycle time stays flat; minimise every crash
input before filing it. Crash artifacts (`crash-<sha1>` etc.) and their
handling are cataloged in
[references/corpus-management.md](references/corpus-management.md);
classification and exploitability rules live in `crash-triage-reference`.

### Step 5 - CI wiring

CI runs a short smoke fuzz (3-5 min per target) on every PR; long
campaigns run outside CI. The engine-generic shape:

```yaml
      - uses: actions/cache@v4          # evolved corpus accumulates across runs
        with:
          path: fuzz/corpus
          key: fuzz-corpus-${{ github.sha }}
          restore-keys: fuzz-corpus-
      - name: Smoke fuzz (5 min)
        run: ./fuzz_target -max_total_time=300 fuzz/corpus fuzz/seeds
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: fuzz-crashes, path: "crash-* leak-* timeout-* oom-*" }
```

Complete per-engine CI jobs (AFL++ Docker, cargo-fuzz nightly matrix, Go
target loop, Jazzer `JAZZER_FUZZ`, Atheris) are in each engine's
reference file.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Picking AFL++ for a callable C/C++ library API | Out-of-process overhead 10-100x | libFuzzer for in-process |
| Picking libFuzzer for a file-processing binary | Adapter glue is complex; AFL++ handles `@@` cleanly | AFL++ |
| Picking cargo-fuzz on stable Rust | Won't compile | Nightly toolchain |
| Fuzzing without sanitizers | Catches only crashes; most bugs silent | Step 3 defaults |
| No seed corpus / no dictionary for structured formats | Fuzzer wanders; slow path discovery | Step 2 |
| Never minimising the corpus | Cycle time degrades; coverage redundant | Weekly `-merge=1` / `afl-cmin` |
| Mixing fuzzer corpora without conversion | libFuzzer / AFL++ formats aren't compatible | One fuzzer's corpus; convert if needed |
| Routing on language alone, ignoring source availability | Closed-source needs QEMU regardless | Factor in availability |

## Limitations

- Per-engine depth lives in the references - flags, harness syntax, and
  CI jobs differ per engine.
- Cross-language targets (e.g. JNI) need two campaigns: Jazzer for the
  Java side, libFuzzer for the C side.
- Crash triage (classification, dedup, exploitability, verdicts) is the
  `crash-triage-reference` sibling's scope, not this skill's.

## References

- [references/libfuzzer.md](references/libfuzzer.md) - libFuzzer harness, flags, CI
- [references/afl-plus-plus.md](references/afl-plus-plus.md) - AFL++ build, parallel campaigns, QEMU, afl-tmin/cmin
- [references/cargo-fuzz.md](references/cargo-fuzz.md) - cargo-fuzz init/add/run, Arbitrary, sanitizer variants
- [references/go-native-fuzzing.md](references/go-native-fuzzing.md) - FuzzXxx targets, testdata/fuzz, regression auto-save
- [references/atheris.md](references/atheris.md) - atheris.Setup, instrument_imports, FuzzedDataProvider
- [references/jazzer.md](references/jazzer.md) - @FuzzTest, JVM sanitizers, JAZZER_FUZZ modes
- [references/corpus-management.md](references/corpus-management.md) - corpus roles, layouts, dictionaries, minimisation
- [references/sanitizer-integration.md](references/sanitizer-integration.md) - the five sanitizers, compatibility, report reading
- LLVM libFuzzer - [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html)
- AFL++ - [github.com/AFLplusplus/AFLplusplus](https://github.com/AFLplusplus/AFLplusplus)
- Go fuzzing - [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz)
- cargo-fuzz - [github.com/rust-fuzz/cargo-fuzz](https://github.com/rust-fuzz/cargo-fuzz)
- Atheris - [github.com/google/atheris](https://github.com/google/atheris)
- Jazzer - [github.com/CodeIntelligenceTesting/jazzer](https://github.com/CodeIntelligenceTesting/jazzer)
- `crash-triage-reference` - reading + classifying the crashes this workflow produces
