---
name: unity-test-framework-c
description: "Author and run ThrowTheSwitch Unity (the C unit-testing library) for bare-metal and RTOS C code. Distinct from the Unity game-engine Test Framework at docs.unity3d.com: this is the ThrowTheSwitch C testing library at throwtheswitch.org/unity, a single C file plus headers that runs on 8-bit MCUs through 64-bit hosts. Anchored on the Unity assertion API and configuration macros regardless of execution environment: the TEST_ASSERT_EQUAL_* / _FLOAT / _DOUBLE / _STRING / _MEMORY / _BITS assertion families, setUp/tearDown/RUN_TEST/UNITY_BEGIN/UNITY_END semantics and the exit-code contract, the generate_test_runner.rb generator, build-time config defines (UNITY_INCLUDE_DOUBLE, UNITY_OUTPUT_CHAR, UNITY_EXCLUDE_SETJMP), and CI integration via Ceedling JUnit XML; applies to host builds, cross-builds, and QEMU-run targets alike. For QEMU machine flags, semihosting, and exit-code capture, see qemu-system-test-runner. Use when the unit-under-test is pure C and the target ranges from 8-bit AVR to Cortex-M0 to Linux ARM."
metadata:
  keywords: "unity, throwtheswitch, c, embedded, unit-testing, arm, avr, cortex-m"
---

# unity-test-framework-c

## Overview

This skill covers ThrowTheSwitch **Unity** - a C unit-testing
library ("a single C file and a pair of headers") at
[throwtheswitch.org/unity](https://www.throwtheswitch.org/unity)
and [github.com/ThrowTheSwitch/Unity](https://github.com/ThrowTheSwitch/Unity),
running on 8-bit MCUs through 64-bit hosts with no preprocessor
magic, no auto-generated `main`, and no C++ requirement.

It is **distinct from the Unity game-engine Test Framework**
(`com.unity.test-framework`, a runner inside the Unity 3D editor
at [docs.unity3d.com](https://docs.unity3d.com/Packages/com.unity.test-framework@latest),
covered by `unity-test-framework`). The two share only a name.

Composes with:

- `ceedling-build-runner` - the build orchestration that calls `generate_test_runner.rb` and stitches Unity + CMock + the test binary.
- ceedling-build-runner's references/cmock.md - the CMock-generated mocks Unity asserts against.
- `qemu-system-test-runner` - for running the cross-built binary on a virtual Cortex-M.
- `embedded-coverage-strategy-reference` - for the gcov / llvm-cov instrumentation.

## When to use

- Unit-under-test is **pure C** (not C++). For C++ use
  `googletest-embedded-arm`.
- Target may be tiny - Unity works on 8-bit AVR / PIC, 16-bit
  MSP430, and 32-bit Cortex-M0/M3/M4/M7/M33.
- The team already has Ceedling, or wants the canonical
  ThrowTheSwitch-stack pairing of Unity + CMock + CException.
- The MCU has limited RAM - Unity's footprint is dramatically
  smaller than GoogleTest's.

## Authoring

### Minimal test

```c
#include "unity.h"
#include "ringbuffer.h"

void setUp(void) {
    /* runs before each test */
}

void tearDown(void) {
    /* runs after each test */
}

void test_ringbuffer_initially_empty(void) {
    ringbuffer_t rb;
    ringbuffer_init(&rb);
    TEST_ASSERT_TRUE(ringbuffer_is_empty(&rb));
    TEST_ASSERT_EQUAL_size_t(0, ringbuffer_size(&rb));
}

void test_ringbuffer_push_increments_size(void) {
    ringbuffer_t rb;
    ringbuffer_init(&rb);
    TEST_ASSERT_EQUAL_INT(0, ringbuffer_push(&rb, 42));
    TEST_ASSERT_EQUAL_size_t(1, ringbuffer_size(&rb));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_ringbuffer_initially_empty);
    RUN_TEST(test_ringbuffer_push_increments_size);
    return UNITY_END();
}
```

A Unity test is a C function taking no arguments, named with a
`test` or `spec` prefix. `UNITY_BEGIN()` initialises counters;
`RUN_TEST(name)` invokes `setUp` -> test fn -> `tearDown` and
captures the result; `UNITY_END()` prints the summary and returns
a non-zero exit code on failure.

### Assertions

The common assertions - `TEST_ASSERT_TRUE(c)`,
`TEST_ASSERT_EQUAL_INT(a,b)` (with `_INT8` / `_INT16` / `_INT32`
/ `_INT64` and `_UINT` / `_HEX` widths),
`TEST_ASSERT_EQUAL_FLOAT(a,b)` / `TEST_ASSERT_FLOAT_WITHIN(delta,a,b)`,
`TEST_ASSERT_EQUAL_STRING(a,b)`, `TEST_ASSERT_EQUAL_MEMORY(a,b,len)`,
`TEST_ASSERT_NULL(p)`. Append `_ARRAY` to compare arrays (third
arg is element count) and `_MESSAGE` to attach a custom failure
string.

The full assertion-family table and the build-time config defines
are in [references/assertion-api.md](references/assertion-api.md).

### Skipping and failing explicitly

```c
void test_only_when_calibrated(void) {
    if (!device_calibrated()) {
        TEST_IGNORE_MESSAGE("device not calibrated; skip");
    }
    /* normal asserts */
}
```

`TEST_IGNORE()` records an "ignored" result, distinct from
pass/fail in the summary.

### generate_test_runner.rb

The Ruby script `auto/generate_test_runner.rb` scans a test file,
finds every `test_*` and `spec_*` function, and emits a
`<file>_Runner.c` that wires them up:

```bash
ruby /path/to/Unity/auto/generate_test_runner.rb \
    test/test_ringbuffer.c test/test_ringbuffer_Runner.c
```

Then compile `test_ringbuffer.c` + `test_ringbuffer_Runner.c` +
`unity.c` and link. Ceedling does this implicitly - see
`ceedling-build-runner`.

## Building

### Host build (fast inner loop)

```bash
gcc -Wall -O0 -g -DUNITY_INCLUDE_DOUBLE \
    -I src -I ext/Unity/src \
    src/ringbuffer.c \
    ext/Unity/src/unity.c \
    test/test_ringbuffer.c test/test_ringbuffer_Runner.c \
    -o test_ringbuffer
./test_ringbuffer
```

`-DUNITY_INCLUDE_DOUBLE` enables the `_DOUBLE` macros (off by
default to save flash on tiny MCUs - per the
[Unity config docs](https://github.com/ThrowTheSwitch/Unity/blob/master/docs/UnityConfigurationGuide.md)).

### Cortex-M0 cross-build (under QEMU)

```bash
arm-none-eabi-gcc -mcpu=cortex-m0 -mthumb -O0 -g \
    -DUNITY_OUTPUT_COLOR \
    --specs=rdimon.specs \
    -I src -I ext/Unity/src \
    src/ringbuffer.c ext/Unity/src/unity.c \
    test/test_ringbuffer.c test/test_ringbuffer_Runner.c \
    -o test_ringbuffer.elf -lrdimon
qemu-system-arm -M mps2-an385 -cpu cortex-m0 \
    -nographic -semihosting-config enable=on,target=native \
    -kernel test_ringbuffer.elf
```

`--specs=rdimon.specs` provides the ARM semihosting library
([developer.arm.com GNU Toolchain](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain)),
so Unity's printf-based reporting reaches QEMU's stdio.

### Build-time configuration

Key defines (`UNITY_INCLUDE_DOUBLE`, `UNITY_OUTPUT_CHAR`,
`UNITY_OUTPUT_COLOR`, `UNITY_FIXTURE_NO_EXTRAS`,
`UNITY_EXCLUDE_SETJMP`) are tabulated in
[references/assertion-api.md](references/assertion-api.md), per
the [Unity configuration guide](https://github.com/ThrowTheSwitch/Unity/blob/master/docs/UnityConfigurationGuide.md).

## Running

### Console output

Unity prints one line per result + a summary:

```
test/test_ringbuffer.c:34:test_ringbuffer_initially_empty:PASS
test/test_ringbuffer.c:42:test_ringbuffer_push_increments_size:PASS

-----------------------
2 Tests 0 Failures 0 Ignored
OK
```

The format is `<file>:<line>:<test_name>:<PASS|FAIL|IGNORE>`.
Failures include the assertion details:

```
test/test_ringbuffer.c:48:test_overflow_returns_minus_one:FAIL: Expected -1 Was 0
```

### Exit code

`UNITY_END()` returns the failure count (`int`). Use it from
`main`:

```c
int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_x);
    return UNITY_END();   /* 0 on all-pass; non-zero on any failure */
}
```

CI tools that gate on exit code (CMake CTest, GitHub Actions
`run:` step) work natively.

## Parsing results

### Console parsing

Unity's text output is intentionally simple - a `grep -c
':FAIL:'` is enough for a smoke gate:

```bash
./test_ringbuffer | tee results.txt
fails=$(grep -c ':FAIL:' results.txt || true)
[ "$fails" -eq 0 ] || exit 1
```

### JUnit XML via Ceedling

Ceedling wraps Unity and emits a JUnit XML report at
`build/artifacts/test/report.xml` - see
`ceedling-build-runner`. The
schema matches GoogleTest's, so the same JUnit pipeline works
for both.

### Custom output

Override `UNITY_OUTPUT_CHAR(c)` at build time:

```c
/* unity_config.h */
#define UNITY_OUTPUT_CHAR(c)    serial_putc(c)
#define UNITY_OUTPUT_FLUSH()    serial_flush()
```

On bare-metal, send results over UART → host serial → CI log
file.

## CI integration

The standalone (no Ceedling) GitHub Actions pipeline - generate
runners, build + run on host, then cross-build and run under
QEMU - is in
[references/ci-integration.md](references/ci-integration.md). For
Ceedling-driven projects, see `ceedling-build-runner` for the
canonical `ceedling test:all` + JUnit XML flow.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Hand-maintaining the test runner | Drift: a new `test_*` function is silently skipped | Run `generate_test_runner.rb` in the build; or use Ceedling |
| `TEST_ASSERT_EQUAL_INT` on `size_t` | Width mismatch warns on 64-bit hosts, may overflow on 8-bit | Use `TEST_ASSERT_EQUAL_size_t` or width-specific `_UINT32` |
| `TEST_ASSERT_TRUE(strcmp(a,b) == 0)` | Failure message reports "Expected true, got false" - useless | Use `TEST_ASSERT_EQUAL_STRING(a,b)` |
| `TEST_ASSERT_EQUAL_MEMORY` with `len=sizeof(*p)` on a struct with padding | Padding bytes vary; intermittent failures | Initialise structs with `memset(.., 0, sizeof)` before fill, or compare fields individually |
| Calling `RUN_TEST` outside `UNITY_BEGIN`/`UNITY_END` | Asserts work but the summary is wrong | Always bracket runs with `UNITY_BEGIN` / `UNITY_END` |
| Mixing the C library with the game-engine Test Framework | Build sees two `unity.h` headers; one wins randomly | Don't co-locate; keep `unity-test-framework` to game-engine projects |
| Float comparison with `TEST_ASSERT_EQUAL_FLOAT` and exact values | Floating-point equality is fragile | Use `TEST_ASSERT_FLOAT_WITHIN(epsilon, a, b)` |
| `UNITY_EXCLUDE_SETJMP` on a target that has setjmp | Loses early-abort on fatal assert; tests run on after corruption | Only exclude when the toolchain genuinely lacks setjmp |

## Limitations

- **No native parameterised tests.** Unity has no `TEST_P`
  equivalent. Loop with a fixture struct and call `TEST_ASSERT_*`
  inside; report the iteration via `_MESSAGE` suffix.
- **No native test discovery.** Without `generate_test_runner.rb`
  (or Ceedling), each test must be manually listed in `main`.
- **Single-threaded.** Unity's failure-recovery uses setjmp/
  longjmp; concurrent tests in the same process collide. RTOS
  tests should run tests serially on the test thread.
- **No GoogleMock-style matchers.** Mocks live in CMock; matcher
  expressivity is per
  ceedling-build-runner's references/cmock.md.
- **`TEST_ASSERT_EQUAL_FLOAT` precision is configurable but
  global.** `UNITY_FLOAT_PRECISION` applies to every float
  compare in the suite; per-test precision needs `_WITHIN`.
- **8-bit targets benefit from `UNITY_FIXTURE_NO_EXTRAS`.**
  Default builds include features (per-test color, fixture
  hooks) that bloat tiny MCUs.

## References

Cited inline. Foundational documents:

- ThrowTheSwitch Unity overview - 
  [www.throwtheswitch.org/unity](https://www.throwtheswitch.org/unity).
- Unity README - 
  [github.com/ThrowTheSwitch/Unity](https://github.com/ThrowTheSwitch/Unity).
- Unity Configuration Guide - 
  [github.com/ThrowTheSwitch/Unity/blob/master/docs/UnityConfigurationGuide.md](https://github.com/ThrowTheSwitch/Unity/blob/master/docs/UnityConfigurationGuide.md).
- ARM GNU Toolchain (`--specs=rdimon.specs`, semihosting) - 
  [developer.arm.com Tools and Software / GNU Toolchain](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain).
- Unity game-engine Test Framework (separate tool; see `unity-test-framework`) - 
  [docs.unity3d.com/Packages/com.unity.test-framework@latest](https://docs.unity3d.com/Packages/com.unity.test-framework@latest).
- Sibling skills:
  `ceedling-build-runner` (CMock semantics in its references/cmock.md),
  `googletest-embedded-arm`,
  `qemu-system-test-runner`,
  `embedded-coverage-strategy-reference`.
