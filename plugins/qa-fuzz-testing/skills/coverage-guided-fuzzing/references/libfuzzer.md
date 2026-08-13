# libFuzzer (C/C++, in-process)

Per-engine reference for `coverage-guided-fuzzing`; the shared workflow
and fuzzer-choice routing live in [../SKILL.md](../SKILL.md).

## Overview

This reference wraps LLVM's libFuzzer (per
[llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html))
for C/C++ targets. Composes with:

- [sanitizer-integration.md](sanitizer-integration.md)
  for ASan + UBSan integration
- [corpus-management.md](corpus-management.md)
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

Per [sanitizer-integration.md](sanitizer-integration.md):
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
[corpus-management.md](corpus-management.md)).

### Common flags

Most-used: `-max_total_time=N`, `-runs=N` (-1 = infinite), `-dict=path`,
`-fork=N`, `-workers=N`, `-merge=1` (corpus minimisation),
`-rss_limit_mb=N` (default 2048), `-timeout=N` (per-input, default 1200).
Full table: see "Full flag table" below (per [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html)).

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

Verify: confirm the replay prints the same sanitiser bug class and top
stack frame as the original finding before minimising. If it does not
reproduce, the artefact is stale against the current build (target or
library rebuilt) - rebuild the target and re-run before proceeding.

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
sanitiser-report output to `bug-report-from-failure`
(in the qa-defect-management plugin):

```bash
./fuzz_target crash-<sha1> 2> sanitiser-report.txt
python scripts/file-bug-from-asan.py sanitiser-report.txt crash-<sha1>
```

## CI integration

Short smoke fuzz (5 min) on every PR: build with
`-fsanitize=fuzzer,address,undefined`, cache `fuzz/corpus`, run
`./fuzz_target -max_total_time=300 fuzz/corpus fuzz/seeds`, and upload
`crash-* / leak-* / timeout-* / oom-*` artifacts. Full workflow: see "Full CI job" below.

For long-running campaigns, OSS-Fuzz ([google.github.io/oss-fuzz](https://google.github.io/oss-fuzz/))
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
  [sanitizer-integration.md](sanitizer-integration.md),
  [corpus-management.md](corpus-management.md).
- Sibling fuzzers:
  [afl-plus-plus.md](afl-plus-plus.md) (out-of-process,
  multi-language),
  [cargo-fuzz.md](cargo-fuzz.md) (Rust wrapper
  around libFuzzer),
  [atheris.md](atheris.md),
  [jazzer.md](jazzer.md),
  [go-native-fuzzing.md](go-native-fuzzing.md),
  OSS-Fuzz ([google.github.io/oss-fuzz](https://google.github.io/oss-fuzz/)).
- Umbrella: [../SKILL.md](../SKILL.md) - fuzzer choice + shared workflow.

## Full flag table

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

## Full CI job

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
