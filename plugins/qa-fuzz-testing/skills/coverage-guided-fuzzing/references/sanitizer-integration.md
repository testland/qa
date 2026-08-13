# Sanitiser integration

Shared reference for `coverage-guided-fuzzing`; the per-engine references
and the umbrella workflow live alongside this file.

## Overview

Pure-reference catalog of the five clang sanitisers (ASan, UBSan,
MSan, TSan, LSan) used with coverage-guided fuzz targets - what
each detects, build flags, runtime options, compatibility matrix,
performance overhead. Consumed by the per-engine references and fuzz-target authoring. For corpus discipline see
[corpus-management.md](corpus-management.md).

## When to use

- Choosing which sanitisers to enable for a fuzz target.
- Interpreting a crash artefact's sanitiser report.
- Tuning sanitiser runtime options for false positives /
  performance.
- CI-gating builds with sanitisers enabled.

## How to use

1. Identify the fuzz target's language and threat model (memory safety, undefined behavior, uninitialised reads, or data races).
2. Pick sanitisers from the summary table below; default to ASan + UBSan for most C / C++ targets.
3. Check the compatibility matrix before combining - ASan + UBSan is fine, but ASan + MSan and anything + TSan are not, so split those into separate binaries.
4. Build with `-fsanitize=fuzzer,<sanitisers>` plus `-fno-sanitize-recover=all` and `-fno-omit-frame-pointer -g`.
5. Set runtime options (`ASAN_OPTIONS`, `UBSAN_OPTIONS`) so the fuzzer aborts on first error.
6. When a crash lands, read the sanitiser report top-down: bug class, access, crash-site frame, then allocation / free site.
7. For MSan-required libraries, build a separate MSan-only binary with all dependencies instrumented and run it as a second campaign.

## The five sanitisers

| Sanitiser | Detects (summary) | Build flag | Slowdown |
|---|---|---|---|
| ASan | heap / stack / global OOB, use-after-free, double-free | `-fsanitize=address -fno-omit-frame-pointer -g` | ~2x |
| UBSan | signed overflow, div-by-zero, null deref, misaligned access | `-fsanitize=undefined -fno-sanitize-recover=all` | ~10% |
| MSan | uninitialised memory reads | `-fsanitize=memory -fno-omit-frame-pointer -fsanitize-memory-track-origins` | 3x |
| TSan | data races, deadlocks, thread-safety violations | `-fsanitize=thread -O1 -g` | 5 - 15x |
| LSan | memory leaks at program exit | `-fsanitize=leak` (or embedded in ASan) | small |

Full per-sanitiser detail - complete detect lists, the `ASAN_OPTIONS` /
`UBSAN_OPTIONS` runtime-option tables, the MSan whole-program requirement, and
LSan's embedded vs standalone modes: see "Per-sanitiser catalog" below.

## Compatibility matrix

Can multiple sanitisers run in the same binary?

| Sanitiser | ASan | UBSan | MSan | TSan |
|---|:---:|:---:|:---:|:---:|
| ASan | - | ✓ | ✗ | ✗ |
| UBSan | ✓ | - | ✓ | ✓ |
| MSan | ✗ | ✓ | - | ✗ |
| TSan | ✗ | ✓ | ✗ | - |

The standard fuzzing pair is **ASan + UBSan** (catches most
memory + UB issues, manageable slowdown):

```bash
clang -g -O1 -fsanitize=fuzzer,address,undefined \
      -fno-sanitize-recover=all \
      -fno-omit-frame-pointer fuzz_target.cc -o fuzz_target
```

For MSan-required projects (e.g., crypto libraries), build a
separate **MSan-only** binary and run it as a second fuzzing
campaign.

## libFuzzer + sanitiser composition

The `-fsanitize=fuzzer,address,undefined` flag composes the
libFuzzer engine with ASan + UBSan in one binary. Each sanitiser
contributes its instrumentation.

Per [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html):

```bash
# Build
clang -g -O1 \
  -fsanitize=fuzzer,address,undefined \
  -fno-sanitize-recover=all \
  fuzz_target.cc -o fuzz_target

# Run
ASAN_OPTIONS=abort_on_error=1:halt_on_error=1 \
UBSAN_OPTIONS=print_stacktrace=1:halt_on_error=1 \
  ./fuzz_target -max_total_time=3600 corpus/
```

## Reading a sanitiser report

ASan output structure:

```
==1234==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x7f...
READ of size 4 at 0x7f... thread T0
    #0 0x4015a3 in process_input src/parser.c:42:5
    #1 0x4012f0 in LLVMFuzzerTestOneInput fuzz_target.cc:10:3
    ...
0x7f... is located 0 bytes to the right of 16-byte region 0x7f..., 0x7f...)
allocated by thread T0 here:
    #0 0x40e7c0 in __interceptor_malloc
    #1 0x4015a3 in process_input src/parser.c:39:9
```

Key fields:
- **Bug class:** `heap-buffer-overflow`, `stack-use-after-return`,
  `use-after-free`, `double-free`, `memory-leak`
- **Access:** READ or WRITE, size
- **Stack:** Top frame = crash site; below = call chain
- **Allocation site:** Where the corrupted memory was allocated
- **Freed site (UAF):** Where the memory was freed

Parse this for the from-CI-failure workflow in `bug-report-template`
(qa-bug-repro plugin) to extract the failure assertion.

## Per-language sanitiser support

| Language | ASan | UBSan | MSan | TSan | LSan |
|---|:---:|:---:|:---:|:---:|:---:|
| C / C++ (clang / GCC) | ✓ | ✓ | ✓ (clang) | ✓ | ✓ |
| Rust (nightly) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Go | partial (race detector for TSan-equivalent) | - | - | ✓ | - |
| Swift | ✓ | ✓ | - | ✓ | ✓ |
| Objective-C | ✓ | ✓ | - | ✓ | ✓ |

Java / Kotlin (Jazzer) uses **JVM-level sanitisers** (sanitisers
for unsafe-API misuse, deserialisation gadgets, ReDoS) rather than
clang's; see [jazzer.md](jazzer.md).

Python (Atheris) uses **per-module instrumentation** + the host
process's libFuzzer; you can attach ASan to the Python interpreter
itself.

## Worked example

A team fuzzes a C++ PNG parser. They choose ASan + UBSan (the standard pair) and
build with:

```bash
clang -g -O1 -fsanitize=fuzzer,address,undefined \
      -fno-sanitize-recover=all -fno-omit-frame-pointer \
      png_fuzzer.cc -o png_fuzzer
```

Running under `ASAN_OPTIONS=abort_on_error=1:halt_on_error=1`, the fuzzer trips
within minutes. The report opens with `heap-buffer-overflow ... READ of size 4`,
top frame `process_input src/parser.c:42`, allocated at `src/parser.c:39` (a
16-byte region). The bug class plus the allocation site pin it to an off-by-one in
the chunk-length handling. The parser has no MSan dependency requirement, so they
skip the separate MSan binary and hand the report to the from-CI-failure workflow in `bug-report-template`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Fuzzing without sanitisers | Catches only crashes; misses 80%+ of memory bugs | Always build with ASan + UBSan minimum |
| `-fsanitize=address,memory` together | MSan + ASan incompatible | Pick one; run separate binaries |
| MSan with non-MSan dependencies | False positives flood the report | Build all dependencies with MSan or skip MSan |
| UBSan without `-fno-sanitize-recover=all` | UBSan logs but doesn't abort; fuzzer never sees the bug | Always add `-fno-sanitize-recover=all` |
| ASan without `-fno-omit-frame-pointer` | Stack traces are useless | Always add `-fno-omit-frame-pointer -g` |
| `detect_leaks=0` in fuzz CI | Leak bugs go unnoticed | Default ASan settings (Linux LSan-enabled) |
| TSan + a non-thread-safe target | Slow + noisy; data races are everywhere | Pick targets where thread-safety claims are made |

## Limitations

- **Performance trade-offs.** ASan + UBSan ≈ 2-3x slowdown; TSan ≈
  10-15x. Long fuzz campaigns need budget planning.
- **Sanitiser incompatibility.** No single binary catches
  everything; multiple campaigns required.
- **Heap-buffer-overflow on rdtsc edges.** Some sanitisers have
  per-architecture false-positive surfaces.
- **Build system integration.** Pre-existing build systems may
  need invasive changes (CMake `-DCMAKE_C_FLAGS=-fsanitize=...`).
- **Library compatibility.** Some C / C++ libraries hand-roll
  memory tricks (custom allocators, intrusive lists) that
  sanitisers misflag.

## References

- LLVM AddressSanitizer - 
  [clang.llvm.org/docs/AddressSanitizer.html](https://clang.llvm.org/docs/AddressSanitizer.html).
- LLVM UBSan - 
  [clang.llvm.org/docs/UndefinedBehaviorSanitizer.html](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html).
- LLVM MemorySanitizer - 
  [clang.llvm.org/docs/MemorySanitizer.html](https://clang.llvm.org/docs/MemorySanitizer.html).
- LLVM ThreadSanitizer - 
  [clang.llvm.org/docs/ThreadSanitizer.html](https://clang.llvm.org/docs/ThreadSanitizer.html).
- LLVM libFuzzer - 
  [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html).
- Per-sanitiser catalog: the "Per-sanitiser catalog" section below.
- Sibling references:
  [corpus-management.md](corpus-management.md).
- Consumed by:
  [libfuzzer.md](libfuzzer.md),
  [afl-plus-plus.md](afl-plus-plus.md),
  [cargo-fuzz.md](cargo-fuzz.md),
  [atheris.md](atheris.md),
  [jazzer.md](jazzer.md),
  OSS-Fuzz ([google.github.io/oss-fuzz](https://google.github.io/oss-fuzz/)).

## Per-sanitiser catalog

### AddressSanitizer (ASan)

**What it detects** (per [clang.llvm.org/docs/AddressSanitizer.html](https://clang.llvm.org/docs/AddressSanitizer.html)):

- Out-of-bounds accesses to heap, stack, and globals
- Use-after-free
- Double-free, invalid free
- Memory leaks (experimental; LSan integrated)

**Build flag:** `-fsanitize=address -fno-omit-frame-pointer -g`

**Performance:** "Typical slowdown introduced by AddressSanitizer
is 2x" per the docs.

**Runtime options** (`ASAN_OPTIONS=key=value:...`):

| Option | Effect |
|---|---|
| `detect_leaks=1` | Enable leak detection (default on Linux) |
| `detect_stack_use_after_return=0` | Disable use-after-return checks (faster) |
| `detect_container_overflow=0` | Disable container-overflow detection |
| `symbolize=0` | Disable online symbolization (use post-mortem) |
| `check_initialization_order=1` | Init-order checking |
| `halt_on_error=1` | Stop on first error |
| `abort_on_error=1` | SIGABRT on error (for fuzzers) |

### UndefinedBehaviorSanitizer (UBSan)

**What it detects:** signed integer overflow, division by zero,
null pointer deref, misaligned access, float-int conversion
overflow, invalid enum / bool, vptr corruption, function-pointer
type mismatch, etc.

**Build flag:** `-fsanitize=undefined -fno-sanitize-recover=all`

The `-fno-sanitize-recover=all` is important for fuzzing - without
it, UBSan logs but doesn't abort, so the fuzzer doesn't see the
bug.

**Performance:** ~10% slowdown - much lighter than ASan.

**Runtime options** (`UBSAN_OPTIONS`):
- `print_stacktrace=1` - include stack trace in reports
- `halt_on_error=1` - abort on first error

### MemorySanitizer (MSan)

**What it detects:** Uninitialised memory reads.

**Build flag:** `-fsanitize=memory -fno-omit-frame-pointer -fsanitize-memory-track-origins`

**Performance:** 3x slowdown.

**Critical:** **MSan requires the entire program (and all
dependencies) to be built with `-fsanitize=memory`**. Linking
against non-MSan-instrumented libraries produces false positives.

**Compatibility:** MSan is incompatible with ASan; cannot combine.

### ThreadSanitizer (TSan)

**What it detects:** Data races, deadlocks, thread-safety
violations.

**Build flag:** `-fsanitize=thread -O1 -g`

**Performance:** 5 - 15x slowdown + 5 - 10x memory.

**Compatibility:** TSan is incompatible with ASan and MSan.

### LeakSanitizer (LSan)

**What it detects:** Memory leaks at program exit.

**Modes:**

- **Embedded in ASan:** `-fsanitize=address` enables LSan by default
  on Linux. Toggle via `detect_leaks=1`.
- **Standalone:** `-fsanitize=leak` - leak detection only, no other
  checks. Smaller overhead.
