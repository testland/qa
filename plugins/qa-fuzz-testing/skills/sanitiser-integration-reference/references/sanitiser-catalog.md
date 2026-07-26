# Sanitiser catalog

Per-sanitiser detail for the five clang sanitisers used with coverage-guided
fuzz targets - what each detects, build flags, runtime options, and performance
overhead. Per clang.llvm.org sanitiser docs.

## AddressSanitizer (ASan)

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

## UndefinedBehaviorSanitizer (UBSan)

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

## MemorySanitizer (MSan)

**What it detects:** Uninitialised memory reads.

**Build flag:** `-fsanitize=memory -fno-omit-frame-pointer -fsanitize-memory-track-origins`

**Performance:** 3x slowdown.

**Critical:** **MSan requires the entire program (and all
dependencies) to be built with `-fsanitize=memory`**. Linking
against non-MSan-instrumented libraries produces false positives.

**Compatibility:** MSan is incompatible with ASan; cannot combine.

## ThreadSanitizer (TSan)

**What it detects:** Data races, deadlocks, thread-safety
violations.

**Build flag:** `-fsanitize=thread -O1 -g`

**Performance:** 5 - 15x slowdown + 5 - 10x memory.

**Compatibility:** TSan is incompatible with ASan and MSan.

## LeakSanitizer (LSan)

**What it detects:** Memory leaks at program exit.

**Modes:**

- **Embedded in ASan:** `-fsanitize=address` enables LSan by default
  on Linux. Toggle via `detect_leaks=1`.
- **Standalone:** `-fsanitize=leak` - leak detection only, no other
  checks. Smaller overhead.
