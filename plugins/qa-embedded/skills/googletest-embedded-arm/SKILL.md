---
name: googletest-embedded-arm
description: "Author and run GoogleTest 1.17+ for embedded C++ on ARM targets — TEST() / TEST_F() / TEST_P() / TYPED_TEST(), EXPECT_* vs ASSERT_* assertions, fixtures with SetUp() / TearDown(), value-parameterised tests, GoogleMock when paired, cross-compile with arm-none-eabi-g++, run on host or under QEMU via the qemu-system-test-runner skill, --gtest_filter / --gtest_output=xml:results.xml / --gtest_shuffle / --gtest_repeat command-line flags, and XML / JSON output parsing for CI. Use when the unit-under-test is C++ (modern C++17+) and the team wants the de-facto C++ test framework instead of the C-only Unity. For C use unity-test-framework-c; for pure mocks use ceedling-mocks-reference."
rating: 24
d6: 4
archetype: S1
keywords: ["googletest", "gtest", "gmock", "embedded", "arm", "c++", "cortex-m", "cortex-a"]
---

# googletest-embedded-arm

## Overview

GoogleTest is, per the README at
[github.com/google/googletest](https://github.com/google/googletest),
"Google's C++ test framework" — an xUnit-style framework merged
with GoogleMock so the two ship together. The 1.17.x branch
"requires at least C++17". For embedded ARM use, the framework
runs anywhere a hosted C++ standard library is available — on
the host, under QEMU, and on Cortex-A Linux targets; for
Cortex-M without an OS, a minimal `_write` / `_exit` semihosting
stub is the bridge.

This skill wraps GoogleTest for embedded C++ work. Composes
with:

- [`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md)
  for gcov / llvm-cov instrumentation.
- [`qemu-system-test-runner`](../qemu-system-test-runner/SKILL.md)
  for running the binary on a virtual Cortex-M / Cortex-A.
- For pure-C suites, prefer
  [`unity-test-framework-c`](../unity-test-framework-c/SKILL.md);
  for mock-heavy suites prefer the Ceedling stack via
  [`ceedling-mocks-reference`](../ceedling-mocks-reference/SKILL.md).

## When to use

- Unit-under-test is **C++** (not C). For C, use
  [`unity-test-framework-c`](../unity-test-framework-c/SKILL.md).
- Target is **Cortex-A running Linux** or **Cortex-M with semihosting**
  — anything with enough RAM for the gtest binary (~300 KB stripped).
- Team wants the **de-facto C++ framework** with rich matchers
  (GoogleMock, value-parameterised tests, typed tests).
- The build pipeline can run a host build for speed and a
  cross-compile under QEMU for architecture sanity.

## Authoring

### Minimal test

Per [google.github.io/googletest/primer.html](https://google.github.io/googletest/primer.html):

```cpp
#include <gtest/gtest.h>
#include "ringbuffer.h"

TEST(RingbufferTest, EmptyOnInit) {
    Ringbuffer<int, 8> rb;
    EXPECT_TRUE(rb.empty());
    EXPECT_EQ(0u, rb.size());
}

TEST(RingbufferTest, PushIncrementsSize) {
    Ringbuffer<int, 8> rb;
    rb.push(42);
    EXPECT_EQ(1u, rb.size());
    EXPECT_FALSE(rb.empty());
}
```

`TEST(SuiteName, TestName)` registers an independent test; the
first argument is "the name of the test suite, and the second
argument is the test's name within the test suite" (Primer doc).

### Fixtures (TEST_F)

When several tests share setup, derive from `::testing::Test`:

```cpp
class RingbufferTest : public ::testing::Test {
protected:
    void SetUp() override { rb.clear(); }
    void TearDown() override { /* nothing */ }
    Ringbuffer<int, 8> rb;
};

TEST_F(RingbufferTest, PopReturnsPushedValue) {
    rb.push(7);
    int v = 0;
    EXPECT_TRUE(rb.pop(&v));
    EXPECT_EQ(7, v);
}
```

Per the Primer: "GoogleTest does not reuse the same test fixture
for multiple tests" — each `TEST_F` gets a fresh instance.

### Value-parameterised tests (TEST_P)

Per [google.github.io/googletest/advanced.html](https://google.github.io/googletest/advanced.html):

```cpp
class WrapTest : public ::testing::TestWithParam<size_t> {};

TEST_P(WrapTest, WrapAtCapacity) {
    Ringbuffer<int, 4> rb;
    for (size_t i = 0; i < GetParam(); ++i) rb.push(static_cast<int>(i));
    EXPECT_EQ(std::min<size_t>(GetParam(), 4), rb.size());
}

INSTANTIATE_TEST_SUITE_P(Boundaries, WrapTest,
                         ::testing::Values(0u, 1u, 3u, 4u, 5u, 100u));
```

`INSTANTIATE_TEST_SUITE_P` is the modern macro (the older
`INSTANTIATE_TEST_CASE_P` is deprecated per the Advanced Guide).

### Typed tests (TYPED_TEST)

Per the Advanced Guide, typed tests run "m tests over n types"
without writing m*n `TEST`s:

```cpp
template <typename T> class IntegralWrapTest : public ::testing::Test {};
using IntegralTypes = ::testing::Types<int8_t, int16_t, int32_t, int64_t>;
TYPED_TEST_SUITE(IntegralWrapTest, IntegralTypes);

TYPED_TEST(IntegralWrapTest, ZeroFits) {
    Ringbuffer<TypeParam, 8> rb;
    rb.push(0);
    EXPECT_EQ(1u, rb.size());
}
```

### Fatal vs non-fatal

| Family | On failure | Use when |
|---|---|---|
| `EXPECT_*` (e.g. `EXPECT_EQ`) | Records failure; continues | Each assertion is independent; collect all failures |
| `ASSERT_*` (e.g. `ASSERT_EQ`) | Records failure; **aborts current function** | Subsequent assertions would crash (e.g. null pointer deref) |

Per the Primer: "Usually EXPECT_* are preferred, as they allow
more than one failure to be reported in a test." Use `ASSERT_*`
only when the next line would dereference a possibly-null pointer
returned from the previous check.

### Death tests

For "expected abort" code paths (assertions, fatal exits) per the
Advanced Guide:

```cpp
TEST(BufferDeathTest, NullPushAborts) {
    Ringbuffer<int, 8> *rb = nullptr;
    EXPECT_DEATH(rb->push(0), "");
}
```

Death tests fork a child process; not all embedded targets
support that. On bare-metal Cortex-M, skip death tests entirely.

## Building

### Host build (fast inner loop)

CMake:

```cmake
include(FetchContent)
FetchContent_Declare(googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG v1.17.0)
FetchContent_MakeAvailable(googletest)

add_executable(ringbuffer_test test/ringbuffer_test.cpp)
target_link_libraries(ringbuffer_test PRIVATE gtest_main)
enable_testing()
add_test(NAME ringbuffer_test COMMAND ringbuffer_test)
```

`gtest_main` provides a `main()` that calls
`testing::InitGoogleTest(&argc, argv)` then `RUN_ALL_TESTS()` —
which "returns 0 on success, 1 on failure" and per the Primer
"You must not ignore the return value of RUN_ALL_TESTS()".

### Cortex-M cross-compile (under QEMU)

The standard recipe — uses `arm-none-eabi-g++` for the toolchain,
`--specs=rdimon.specs` to pull in the
[`librdimon`](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain)
semihosting library so stdout reaches QEMU:

```bash
arm-none-eabi-g++ -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard \
    -O0 -g -std=c++17 \
    -DGTEST_HAS_PTHREAD=0 -DGTEST_OS_LINUX=0 -DGTEST_LANG_CXX11=1 \
    --specs=rdimon.specs \
    -I/path/to/googletest/googletest/include \
    test/ringbuffer_test.cpp /path/to/googletest/googletest/src/gtest-all.cc \
    -o ringbuffer_test.elf -lrdimon
```

`-DGTEST_HAS_PTHREAD=0` is critical — bare-metal targets have
no pthreads; the build fails without it. (The flag is documented
in GoogleTest's `port.h`.)

For Cortex-A Linux targets, use the standard
`arm-linux-gnueabihf-g++` and drop the `--specs` flag.

### Build invariants

| Invariant | Why |
|---|---|
| `-O0 -g` for coverage builds | gcov / llvm-cov measure post-optimisation flow; see [`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md) |
| `-Wno-psabi` on ARM | Suppresses noisy ABI warnings on cross-compile |
| `-fno-exceptions -fno-rtti` if MCU build does | Match the production firmware's flags so virtual dispatch matches |
| Link with `-Wl,--gc-sections` + compile with `-ffunction-sections -fdata-sections` | Keeps the .elf small enough for low-RAM Cortex-M0 simulation |

## Running

### Host

```bash
./ringbuffer_test
# [==========] Running 7 tests from 2 test suites.
# ...
# [  PASSED  ] 7 tests.
```

### Under QEMU

Detailed in [`qemu-system-test-runner`](../qemu-system-test-runner/SKILL.md):

```bash
qemu-system-arm -M mps2-an385 -cpu cortex-m3 \
    -nographic -semihosting-config enable=on,target=native \
    -kernel ringbuffer_test.elf
```

The `-kernel` flag loads the ELF; `-semihosting-config` lets the
ARM semihosting syscalls go to QEMU's stdio.

### Command-line flags

Per the Advanced Guide:

| Flag | Effect |
|---|---|
| `--gtest_filter=Pattern` | "a `:`-separated list of wildcard patterns" — supports `*`, `?`, and negative `-` patterns |
| `--gtest_repeat=N` | Repeats all tests N times (use `-1` for infinite — useful for flake hunting) |
| `--gtest_shuffle` | Random order each run — "reveal bad dependencies between tests" |
| `--gtest_output=xml:results.xml` / `json:results.json` | Machine-readable report (the value is `"xml:path"` or `"json:path"`) |
| `--gtest_break_on_failure` | Drops into debugger on first failure |
| `--gtest_catch_exceptions=0` | Disables exception handling — lets debugger catch the throw |
| `--gtest_color=yes\|no\|auto` | Coloured terminal output |
| `--gtest_brief=1` | Only failures shown |
| `--gtest_list_tests` | List without running |

## Parsing results

### XML output schema

Per the Advanced Guide, the XML follows a hierarchical structure
with `<testsuites>` / `<testsuite>` / `<testcase>` elements, with
`<failure>` nodes nested under failing `<testcase>` entries:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="7" failures="1" time="0.012">
  <testsuite name="RingbufferTest" tests="2" failures="0" time="0.001">
    <testcase name="EmptyOnInit" status="run" time="0.000"/>
    <testcase name="PushIncrementsSize" status="run" time="0.001"/>
  </testsuite>
  <testsuite name="WrapTest" tests="5" failures="1" time="0.011">
    <testcase name="WrapAtCapacity/4" status="run" time="0.002">
      <failure message="Expected: 5, actual: 4"/>
    </testcase>
  </testsuite>
</testsuites>
```

JUnit-compatible — feeds straight into GitHub Actions
`actions/upload-artifact` + `mikepenz/action-junit-report`.

### JSON output schema

Per the Advanced Guide: a "Proto3-compatible structure with
UnitTest → TestCase → TestInfo → Failure hierarchy, including
timestamps and durations". Prefer JSON for custom dashboards;
XML for the JUnit ecosystem.

### Parsing pattern

```bash
./ringbuffer_test --gtest_output=xml:results.xml
xmlstarlet sel -t -v "count(//testcase[failure])" results.xml
# Number of failing testcases — gate on this
```

## CI integration

```yaml
jobs:
  embedded-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Install ARM toolchain
        run: sudo apt-get install -y gcc-arm-none-eabi qemu-system-arm
      - name: Configure (host build)
        run: cmake -S . -B build-host -DCMAKE_BUILD_TYPE=Coverage
      - name: Build + run on host
        run: |
          cmake --build build-host
          ./build-host/ringbuffer_test \
            --gtest_output=xml:build-host/host-results.xml \
            --gtest_shuffle
      - name: Cross-compile + run under QEMU
        run: |
          arm-none-eabi-g++ -mcpu=cortex-m4 -mthumb -O0 -g -std=c++17 \
            -DGTEST_HAS_PTHREAD=0 --specs=rdimon.specs \
            -I ext/googletest/googletest/include \
            test/ringbuffer_test.cpp ext/googletest/googletest/src/gtest-all.cc \
            -o build-arm/ringbuffer_test.elf -lrdimon
          qemu-system-arm -M mps2-an385 -cpu cortex-m4 \
            -nographic -semihosting-config enable=on,target=native \
            -kernel build-arm/ringbuffer_test.elf
      - name: Publish JUnit
        uses: mikepenz/action-junit-report@v4
        with:
          report_paths: 'build-host/*-results.xml'
```

The host build gates on the JUnit XML; the QEMU build gates on
QEMU's exit code (semihosting `exit(RUN_ALL_TESTS())` propagates
the gtest return value through QEMU).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `ASSERT_EQ` then ignore the abort and continue | Subsequent assertions undefined; can crash | Use `EXPECT_EQ` unless next line dereferences the value |
| `GTEST_HAS_PTHREAD=1` on bare-metal Cortex-M | Link fails: pthread symbols missing | Always `-DGTEST_HAS_PTHREAD=0` on M-profile cross-builds |
| Death tests on bare-metal | No `fork()`; test hangs or aborts oddly | Skip death tests on M-profile; or use `--gtest_filter=-*DeathTest*` |
| Linking `gtest` without `gtest_main` then no own `main` | "undefined reference to main" | Link `gtest_main` or write `int main(int argc, char **argv) { testing::InitGoogleTest(&argc, argv); return RUN_ALL_TESTS(); }` |
| Test order dependence | `--gtest_shuffle` reveals; CI breaks intermittently | Each `TEST_F` must work in any order; reset state in `SetUp` |
| Optimised coverage build | `-O2` collapses branches gcov can't see | `-O0 -g` for the coverage build per coverage-reference skill |
| `TEST_P` without `INSTANTIATE_TEST_SUITE_P` | Compiles but never runs | Always pair |
| Mocking everything | Tests measure mocks not behaviour | Mock at the I/O boundary only — see `ceedling-mocks-reference` |

## Limitations

- **C++ only.** For pure C suites use
  [`unity-test-framework-c`](../unity-test-framework-c/SKILL.md).
- **Heap required.** GoogleTest allocates internally; ultra-low-
  RAM Cortex-M0 (8–16 KB) may not have headroom. Use Unity for
  those targets.
- **No native parameterised test = different test names.** Each
  `TEST_P` instance is `Boundaries/WrapTest.WrapAtCapacity/4` —
  the `/4` is the param index, not the value. Use
  `INSTANTIATE_TEST_SUITE_P(..., ::testing::PrintToStringParamName())`
  to encode the value into the name.
- **Death tests require `fork()`** — not available on bare-metal
  or under most RTOSes. Per the Advanced Guide they run "in
  separate child processes".
- **No determinism guarantee with `--gtest_shuffle`** — the seed
  is logged but rerunning with the same seed and a code change
  produces a different schedule.
- **GoogleMock pulls in `std::function`-based call recording** —
  on cross-compiles with `-fno-exceptions` you may need
  `-DGTEST_HAS_EXCEPTIONS=0` to compile cleanly.

## References

Cited inline. Foundational documents:

- GoogleTest README — [github.com/google/googletest](https://github.com/google/googletest).
- GoogleTest Primer — [google.github.io/googletest/primer.html](https://google.github.io/googletest/primer.html).
- GoogleTest Advanced Guide — [google.github.io/googletest/advanced.html](https://google.github.io/googletest/advanced.html).
- ARM GNU Toolchain — [developer.arm.com Tools and Software / GNU Toolchain](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain).
- Sibling skills:
  [`unity-test-framework-c`](../unity-test-framework-c/SKILL.md),
  [`ceedling-build-runner`](../ceedling-build-runner/SKILL.md),
  [`ceedling-mocks-reference`](../ceedling-mocks-reference/SKILL.md),
  [`qemu-system-test-runner`](../qemu-system-test-runner/SKILL.md),
  [`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md),
  [`hardware-in-loop-reference`](../hardware-in-loop-reference/SKILL.md).
