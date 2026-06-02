---
name: libfuzzer-cpp
description: "Author and run LLVM libFuzzer for C/C++ - in-process coverage-guided fuzzing. Covers harness authoring (LLVMFuzzerTestOneInput entry point), build with -fsanitize=fuzzer,address,undefined, runtime flags (-max_total_time, -runs, -dict, -fork, -workers), corpus + crash-artefact handling, and CI integration. Use for libraries / parsers / decoders in C/C++ where in-process fuzzing of a function is the right scope. Compose with ASan + UBSan from sanitiser-integration-reference and corpus discipline from corpus-management-reference."
rating: 24
d6: 4
archetype: S1
---

# libfuzzer-cpp

## Overview

This skill wraps LLVM's libFuzzer (per
[llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html))
for C/C++ targets. Composes with:

- [`sanitiser-integration-reference`](../sanitiser-integration-reference/SKILL.md)
  for ASan + UBSan integration
- [`corpus-management-reference`](../corpus-management-reference/SKILL.md)
  for seed / evolved-corpus / crash artefact discipline

## When to use

- Fuzzing a C / C++ library function (parser, decoder, validator).
- Targeting a specific function - in-process fuzzing is faster
  than out-of-process AFL.
- Pairing with ASan + UBSan for memory-safety + UB detection.

## Authoring

### The fuzz target

Define the entry point `LLVMFuzzerTestOneInput`:

```cpp
#include <cstddef>
#include <cstdint>
#include "your_library.h"

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *Data, size_t Size) {
    your_parser(Data, Size);
    return 0;
}
```

Per LLVM docs, the function signature is fixed: takes a const
byte buffer + size, returns int (must return 0 for normal
execution; non-zero values are reserved).

The fuzzer calls this function repeatedly with mutated `Data`. The
target's job is to **drive the library code under test** and let
sanitisers + asserts catch bugs.

### Initialisation

Optional one-time setup:

```cpp
extern "C" int LLVMFuzzerInitialize(int *argc, char ***argv) {
    your_library_init();
    return 0;
}
```

### Build

Standard build flag:

```bash
clang -g -O1 \
  -fsanitize=fuzzer,address,undefined \
  -fno-sanitize-recover=all \
  -fno-omit-frame-pointer \
  fuzz_target.cc your_library.cc -o fuzz_target
```

Per [`sanitiser-integration-reference`](../sanitiser-integration-reference/SKILL.md):
ASan + UBSan is the default pair; add MSan in a separate binary if
needed.

### Tips for an effective target

| Tip | Why |
|---|---|
| Keep the target small | Faster iteration; clearer coverage |
| Avoid global state between runs | Cross-input contamination defeats coverage guidance |
| Use the full input | Don't `if (Size < 100) return 0;` unless the lib requires |
| Avoid expensive I/O / network in the target | Slows iterations |
| Use `FuzzedDataProvider` for structured inputs | Splits Data into typed sub-values |

`FuzzedDataProvider` (from LLVM's `compiler-rt/include/fuzzer/FuzzedDataProvider.h`):

```cpp
#include <fuzzer/FuzzedDataProvider.h>

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *Data, size_t Size) {
    FuzzedDataProvider fdp(Data, Size);
    int port = fdp.ConsumeIntegralInRange(1, 65535);
    std::string host = fdp.ConsumeRandomLengthString(64);
    std::vector<uint8_t> body = fdp.ConsumeRemainingBytes<uint8_t>();
    your_request_handler(host, port, body);
    return 0;
}
```

## Running

### Basic run

```bash
mkdir corpus/ seeds/
# Populate seeds/ with hand-curated inputs
./fuzz_target -max_total_time=3600 corpus/ seeds/
```

The first directory is writable (evolved corpus); subsequent are
read-only seeds (per
[`corpus-management-reference`](../corpus-management-reference/SKILL.md)).

### Common flags

Per [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html):

| Flag | Effect |
|---|---|
| `-max_total_time=N` | Stop after N seconds |
| `-runs=N` | Stop after N executions (-1 = infinite) |
| `-dict=path` | Use dictionary file |
| `-seed=N` | Random seed |
| `-fork=N` | Run N parallel fork-mode workers |
| `-workers=N` | Number of parallel worker processes |
| `-jobs=N` | Total number of jobs to run across workers |
| `-merge=1` | Corpus minimisation mode |
| `-print_final_stats=1` | Print stats summary on exit |
| `-rss_limit_mb=N` | RSS memory limit (default 2048) |
| `-timeout=N` | Per-input timeout in seconds (default 1200) |
| `-only_ascii=1` | Restrict to ASCII bytes |

### Parallel fuzzing

```bash
./fuzz_target -fork=8 -max_total_time=3600 corpus/ seeds/
```

`-fork=N` spawns N processes, each with its own corpus subset.
Combine corpora periodically with `-merge=1`.

### Reproducing a crash

```bash
./fuzz_target crash-<sha1>
# Sanitiser report prints to stderr; same as the original crash
```

Minimise the crash input:

```bash
./fuzz_target -minimize_crash=1 -runs=10000 crash-<sha1>
# Writes minimized-from-crash-<sha1> with the smallest reproducer
```

### Dictionary file

For structured formats:

```
# fuzz.dict
"{"
"}"
"["
"]"
"true"
"false"
"null"
"\":\""
```

Invoke: `./fuzz_target -dict=fuzz.dict corpus/`.

## Parsing results

libFuzzer crash artefacts are saved as:

- `crash-<sha1>` - segfault / sanitiser-detected error
- `leak-<sha1>` - memory leak detected by LSan
- `timeout-<sha1>` - exceeded `-timeout`
- `oom-<sha1>` - RSS exceeded `-rss_limit_mb`

Each file's contents are the input bytes that triggered the
crash. Pair with the sanitiser report (stderr) for stack +
allocation site.

For automated parsing (e.g., file as a bug), feed the
sanitiser-report output to
[`bug-report-from-failure`](../../../qa-defect-management/skills/bug-report-from-failure/SKILL.md):

```bash
./fuzz_target crash-<sha1> 2> sanitiser-report.txt
python scripts/file-bug-from-asan.py sanitiser-report.txt crash-<sha1>
```

## CI integration

Short smoke fuzz on every PR:

```yaml
jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Install clang
        run: sudo apt-get install -y clang lld
      - name: Build fuzz target
        run: |
          clang++ -g -O1 \
            -fsanitize=fuzzer,address,undefined \
            -fno-sanitize-recover=all \
            -fno-omit-frame-pointer \
            fuzz/fuzz_target.cc lib/parser.cc -o fuzz_target
      - uses: actions/cache@v4
        with:
          path: fuzz/corpus
          key: fuzz-corpus-${{ github.sha }}
          restore-keys: fuzz-corpus-
      - name: Smoke fuzz (5 min)
        run: ./fuzz_target -max_total_time=300 fuzz/corpus fuzz/seeds
      - name: Upload crashes
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: crashes
          path: |
            crash-*
            leak-*
            timeout-*
            oom-*
```

For long-running campaigns, [`ossfuzz-integration`](../ossfuzz-integration/SKILL.md)
is the canonical infrastructure.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `LLVMFuzzerTestOneInput` with global state mutation | Cross-input contamination breaks coverage signal | Reset state per call or use `LLVMFuzzerInitialize` |
| Fuzz target without ASan + UBSan | Catches only crashes; 80%+ of bugs missed | Always compose with sanitisers |
| No corpus minimisation ever | Corpus grows unbounded; cycle time degrades | Weekly `-merge=1` |
| Crash committed without minimisation | Large bug-report attachments | Always `-minimize_crash=1` |
| Single huge fuzz target | Slow iterations; coverage attribution opaque | Split into multiple targets per function |
| Ignoring `-rss_limit_mb` OOMs | False crash class | Set limit explicit; or disable allocator-related target paths |
| No dictionary for structured formats | Fuzzer slowly rediscovers grammar | Always supply `-dict=` for JSON / XML / SQL / proto |

## Limitations

- **In-process only.** Doesn't fuzz inter-process boundaries; for
  network protocols see AFL++ in `-Q` (QEMU) mode or specialised
  tools.
- **C / C++ + Rust + Swift only.** Other languages have their own
  fuzzers (Atheris, Jazzer, Go native).
- **Coverage instrumentation overhead.** Hot inner loops slow
  significantly under `-fsanitize=fuzzer`.
- **Crash uniqueness heuristic.** libFuzzer dedup is sha1-based on
  the input; the same bug from two inputs creates two artefacts - 
  pair with crash-stack-deduplication tooling.
- **No coverage report by default.** Use `-coverage` flag or
  external `llvm-profdata` + `llvm-cov` for line-level coverage.

## References

- LLVM libFuzzer - 
  [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html).
- `FuzzedDataProvider.h` - 
  github.com/llvm/llvm-project/blob/main/compiler-rt/include/fuzzer/FuzzedDataProvider.h.
- Composes:
  [`sanitiser-integration-reference`](../sanitiser-integration-reference/SKILL.md),
  [`corpus-management-reference`](../corpus-management-reference/SKILL.md).
- Sibling fuzzers:
  [`afl-plus-plus`](../afl-plus-plus/SKILL.md) (out-of-process,
  multi-language),
  [`cargo-fuzz-rust`](../cargo-fuzz-rust/SKILL.md) (Rust wrapper
  around libFuzzer),
  [`atheris-python-fuzzing`](../atheris-python-fuzzing/SKILL.md),
  [`jazzer-jvm-fuzzing`](../jazzer-jvm-fuzzing/SKILL.md),
  [`go-native-fuzzing`](../go-native-fuzzing/SKILL.md),
  [`ossfuzz-integration`](../ossfuzz-integration/SKILL.md).
- Dispatcher:
  [`fuzz-toolkit-dispatcher`](../fuzz-toolkit-dispatcher/SKILL.md).
