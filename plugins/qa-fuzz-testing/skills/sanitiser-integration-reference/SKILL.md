---
name: sanitiser-integration-reference
description: "Pure-reference catalog of compiler sanitisers used with fuzz testing - AddressSanitizer (ASan), UndefinedBehaviorSanitizer (UBSan), MemorySanitizer (MSan), ThreadSanitizer (TSan), and LeakSanitizer (LSan). Explains what each detects, compatibility (can ASan + UBSan combine? - yes; ASan + MSan? - no), build flags, runtime options (ASAN_OPTIONS / UBSAN_OPTIONS env vars), and the typical ~2x slowdown per ASan. Use to pick the right sanitiser per fuzz target, configure the build, and interpret crash reports."
---

# sanitiser-integration-reference

## Overview

Pure-reference catalog of the five clang sanitisers (ASan, UBSan,
MSan, TSan, LSan) used with coverage-guided fuzz targets - what
each detects, build flags, runtime options, compatibility matrix,
performance overhead. Consumed by the per-language fuzzer skills
and fuzz-target authoring. For corpus discipline see
`corpus-management-reference`.

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
LSan's embedded vs standalone modes:
[references/sanitiser-catalog.md](references/sanitiser-catalog.md).

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

Parse this for `bug-report-from-failure`
to extract the failure assertion.

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
clang's; see [`jazzer-jvm-fuzzing`.

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
skip the separate MSan binary and hand the report to `bug-report-from-failure`.

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
- Sanitiser catalog detail: [references/sanitiser-catalog.md](references/sanitiser-catalog.md).
- Sibling references:
  `corpus-management-reference`.
- Consumed by:
  `libfuzzer-cpp`,
  `afl-plus-plus`,
  `cargo-fuzz-rust`,
  `atheris-python-fuzzing`,
  `jazzer-jvm-fuzzing`,
  `ossfuzz-integration`.
