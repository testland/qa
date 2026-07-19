---
name: unity-test-framework-c
description: "Author and run ThrowTheSwitch Unity (the C unit-testing library) for bare-metal and RTOS C code. Distinct from the Unity game-engine Test Framework at docs.unity3d.com: this is the ThrowTheSwitch C testing library at throwtheswitch.org/unity, a single C file plus headers that runs on 8-bit MCUs through 64-bit hosts. Anchored on the Unity assertion API and configuration macros regardless of execution environment: the TEST_ASSERT_EQUAL_* / _FLOAT / _DOUBLE / _STRING / _MEMORY / _BITS assertion families, setUp/tearDown/RUN_TEST/UNITY_BEGIN/UNITY_END semantics and the exit-code contract, the generate_test_runner.rb generator, build-time config defines (UNITY_INCLUDE_DOUBLE, UNITY_OUTPUT_CHAR, UNITY_EXCLUDE_SETJMP), and CI integration via Ceedling JUnit XML; applies to host builds, cross-builds, and QEMU-run targets alike. For QEMU machine flags, semihosting, and exit-code capture, see qemu-system-test-runner. Use when the unit-under-test is pure C and the target ranges from 8-bit AVR to Cortex-M0 to Linux ARM."
metadata:
  keywords: "unity, throwtheswitch, c, embedded, unit-testing, arm, avr, cortex-m"
---

# unity-test-framework-c

## Overview

**Disambiguation up front:** this skill covers ThrowTheSwitch
**Unity** - a C unit-testing library at
[throwtheswitch.org/unity](https://www.throwtheswitch.org/unity)
and [github.com/ThrowTheSwitch/Unity](https://github.com/ThrowTheSwitch/Unity).
It is **distinct from the Unity game-engine Test Framework at
docs.unity3d.com** (a managed-test runner inside the Unity 3D
editor). The two tools share only a name; they have unrelated
origins, APIs, and consumers. If you reached this skill looking
for the Unity-the-game-engine test framework, the canonical
package is `com.unity.test-framework` documented at
[docs.unity3d.com](https://docs.unity3d.com/Packages/com.unity.test-framework@latest)
and covered by `unity-test-framework`.

Unity is, per [throwtheswitch.org/unity](https://www.throwtheswitch.org/unity),
"a Unit-Testing framework written in 100% pure ANSI C" that is
"carefully written and self-tested to be portable, working
efficiently on tiny 8-bit microcontrollers to 64-bit
powerhouses". Per the README at
[github.com/ThrowTheSwitch/Unity](https://github.com/ThrowTheSwitch/Unity),
it is "a single C file and a pair of headers, allowing it to be
added to your existing build setup". The framework lets the
developer "test in C without littering your source code with
additional requirements" - there is no preprocessor magic, no
auto-generated `main`, no C++ requirement.

Composes with:

- [`ceedling-build-runner`](../ceedling-build-runner/SKILL.md) - 
  the build orchestration that calls `generate_test_runner.rb`
  and stitches Unity + CMock + the test binary.
- [`ceedling-mocks-reference`](../ceedling-mocks-reference/SKILL.md) - 
  the CMock-generated mocks Unity asserts against.
- [`qemu-system-test-runner`](../qemu-system-test-runner/SKILL.md) - 
  for running the cross-built binary on a virtual Cortex-M.
- [`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md) - 
  for the gcov / llvm-cov instrumentation.

## When to use

- Unit-under-test is **pure C** (not C++). For C++ use
  [`googletest-embedded-arm`](../googletest-embedded-arm/SKILL.md).
- Target may be tiny - Unity works on 8-bit AVR / PIC, 16-bit
  MSP430, and 32-bit Cortex-M0/M3/M4/M7/M33. Per the throwtheswitch
  page above, it runs "efficiently on tiny 8-bit microcontrollers".
- The team already has Ceedling, or wants the canonical
  ThrowTheSwitch-stack pairing of Unity + CMock + CException.
- The MCU has limited RAM - Unity's footprint is dramatically
  smaller than GoogleTest's.

## Authoring

### Minimal test

Per the Unity README:

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

Per the README: a Unity test is "just a C function that takes no
arguments and returns nothing. By convention, it starts with the
word 'test' or 'spec'." `UNITY_BEGIN()` initialises counters;
`RUN_TEST(name)` invokes `setUp` → test fn → `tearDown` and
captures the result; `UNITY_END()` prints the summary and returns
a non-zero exit code on failure.

### Assertion families

Per the Unity README:

| Family | Macros |
|---|---|
| **Basic validity** | `TEST_ASSERT_TRUE(c)`, `TEST_ASSERT_FALSE(c)`, `TEST_ASSERT(c)`, `TEST_FAIL()`, `TEST_IGNORE()` |
| **Equality, integer** | `TEST_ASSERT_EQUAL_INT(a,b)`, with width variants `_INT8` / `_INT16` / `_INT32` / `_INT64`; `_UINT` family analogous |
| **Equality, hex** | `TEST_ASSERT_EQUAL_HEX(a,b)`, with `_HEX8` / `_HEX16` / `_HEX32` / `_HEX64` width variants |
| **Equality, float** | `TEST_ASSERT_EQUAL_FLOAT(a,b)`, `TEST_ASSERT_EQUAL_DOUBLE(a,b)`, plus delta variants `TEST_ASSERT_FLOAT_WITHIN(delta,a,b)` |
| **String / memory** | `TEST_ASSERT_EQUAL_STRING(a,b)`, `TEST_ASSERT_EQUAL_MEMORY(a,b,len)` |
| **Pointer** | `TEST_ASSERT_NULL(p)`, `TEST_ASSERT_NOT_NULL(p)` |
| **Range** | `TEST_ASSERT_WITHIN(delta,a,b)`, `TEST_ASSERT_GREATER_THAN(a,b)`, `TEST_ASSERT_LESS_THAN(a,b)` |
| **Bitwise** | `TEST_ASSERT_BITS(mask,expected,actual)`, `TEST_ASSERT_BIT_HIGH(n,x)`, `TEST_ASSERT_BIT_LOW(n,x)` |
| **Array** | "Append `_ARRAY` or `_EACH_EQUAL` to most macros" per the README - e.g. `TEST_ASSERT_EQUAL_INT_ARRAY(expected, actual, num)` |
| **Message variant** | "All assertions support `_MESSAGE` variants" - e.g. `TEST_ASSERT_EQUAL_INT_MESSAGE(a,b,"frame count")` adds a custom failure string |

The `_MESSAGE` suffix is the canonical way to attach
context - failures print the message inline. The `_ARRAY` suffix
turns any equality macro into an array-comparing one (third arg
is element count).

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

Per the same README, the Ruby script
`auto/generate_test_runner.rb` scans a test file, finds every
`test_*` and `spec_*` function, and emits a `<file>_Runner.c`
that wires them up:

```bash
ruby /path/to/Unity/auto/generate_test_runner.rb \
    test/test_ringbuffer.c test/test_ringbuffer_Runner.c
```

Then compile `test_ringbuffer.c` + `test_ringbuffer_Runner.c` +
`unity.c` and link. Ceedling does this implicitly - see
[`ceedling-build-runner`](../ceedling-build-runner/SKILL.md).

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

Per the Unity configuration guide (linked above), key defines:

| Define | Effect |
|---|---|
| `UNITY_INCLUDE_DOUBLE` | Enables `_DOUBLE` assertions |
| `UNITY_FLOAT_PRECISION` | Default delta for `_WITHIN` float comparison |
| `UNITY_OUTPUT_CHAR(c)` | Redirect output (default: putchar) - set to a UART putc for bare-metal |
| `UNITY_OUTPUT_COLOR` | ANSI colour codes in output |
| `UNITY_FIXTURE_NO_EXTRAS` | Slim build for very small MCUs |
| `UNITY_EXCLUDE_SETJMP` | If toolchain has no setjmp - Unity falls back to a longjmp-free mode but loses the early-abort-on-fatal-assert behaviour |

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
[`ceedling-build-runner`](../ceedling-build-runner/SKILL.md). The
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

Standalone (no Ceedling):

```yaml
jobs:
  unity-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Install toolchain
        run: sudo apt-get install -y gcc-arm-none-eabi qemu-system-arm ruby
      - name: Generate runners
        run: |
          for t in test/test_*.c; do
            ruby ext/Unity/auto/generate_test_runner.rb "$t" "${t%.c}_Runner.c"
          done
      - name: Build + run on host
        run: |
          gcc -O0 -g -DUNITY_INCLUDE_DOUBLE \
              -I src -I ext/Unity/src \
              src/*.c ext/Unity/src/unity.c \
              test/test_*.c test/*_Runner.c \
              -o build/unity_host
          ./build/unity_host | tee build/host.log
          ! grep -q ':FAIL:' build/host.log
      - name: Cross-build + QEMU run
        run: |
          arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O0 -g \
              --specs=rdimon.specs \
              -I src -I ext/Unity/src \
              src/*.c ext/Unity/src/unity.c \
              test/test_*.c test/*_Runner.c \
              -o build/unity_arm.elf -lrdimon
          qemu-system-arm -M mps2-an385 -cpu cortex-m4 \
              -nographic -semihosting-config enable=on,target=native \
              -kernel build/unity_arm.elf | tee build/arm.log
          ! grep -q ':FAIL:' build/arm.log
```

For Ceedling-driven projects, see
[`ceedling-build-runner`](../ceedling-build-runner/SKILL.md) for
the canonical `ceedling test:all` + JUnit XML flow.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Hand-maintaining the test runner | Drift: a new `test_*` function is silently skipped | Run `generate_test_runner.rb` in the build; or use Ceedling |
| `TEST_ASSERT_EQUAL_INT` on `size_t` | Width mismatch warns on 64-bit hosts, may overflow on 8-bit | Use `TEST_ASSERT_EQUAL_size_t` or width-specific `_UINT32` |
| `TEST_ASSERT_TRUE(strcmp(a,b) == 0)` | Failure message reports "Expected true, got false" - useless | Use `TEST_ASSERT_EQUAL_STRING(a,b)` |
| `TEST_ASSERT_EQUAL_MEMORY` with `len=sizeof(*p)` on a struct with padding | Padding bytes vary; intermittent failures | Initialise structs with `memset(.., 0, sizeof)` before fill, or compare fields individually |
| Calling `RUN_TEST` outside `UNITY_BEGIN`/`UNITY_END` | Asserts work but the summary is wrong | Always bracket runs with `UNITY_BEGIN` / `UNITY_END` |
| Mixing the C library with the game-engine Test Framework | Build sees two `unity.h` headers; one wins randomly | Don't co-locate. Use `unity-test-framework` only for game engine projects; this skill for embedded C |
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
  [`ceedling-mocks-reference`](../ceedling-mocks-reference/SKILL.md).
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
- **Distinct from**: Unity game-engine Test Framework - 
  [docs.unity3d.com/Packages/com.unity.test-framework@latest](https://docs.unity3d.com/Packages/com.unity.test-framework@latest)
  (covered by `unity-test-framework`).
- Sibling skills:
  [`ceedling-build-runner`](../ceedling-build-runner/SKILL.md),
  [`ceedling-mocks-reference`](../ceedling-mocks-reference/SKILL.md),
  [`googletest-embedded-arm`](../googletest-embedded-arm/SKILL.md),
  [`qemu-system-test-runner`](../qemu-system-test-runner/SKILL.md),
  [`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md).
