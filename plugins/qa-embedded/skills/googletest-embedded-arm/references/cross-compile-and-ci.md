# GoogleTest cross-compile, output parsing, and CI for embedded ARM

Deep reference for the `googletest-embedded-arm` SKILL.md. Consult when wiring
the full toolchain (host CMake, Cortex-M / Cortex-A cross-compile), reading the
XML / JSON output schema, or gating CI.

## Host build (fast inner loop)

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
`testing::InitGoogleTest(&argc, argv)` then `RUN_ALL_TESTS()` - which "returns
0 on success, 1 on failure" and per
[google.github.io/googletest/primer.html](https://google.github.io/googletest/primer.html)
"You must not ignore the return value of RUN_ALL_TESTS()".

## Cortex-M cross-compile (under QEMU)

The standard recipe - uses `arm-none-eabi-g++` for the toolchain,
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

`-DGTEST_HAS_PTHREAD=0` is critical - bare-metal targets have no pthreads; the
build fails without it. (The flag is documented in GoogleTest's `port.h`.) For
Cortex-A Linux targets, use the standard `arm-linux-gnueabihf-g++` and drop the
`--specs` flag.

### Build invariants

| Invariant | Why |
|---|---|
| `-O0 -g` for coverage builds | gcov / llvm-cov measure post-optimisation flow; see `embedded-coverage-strategy-reference` |
| `-Wno-psabi` on ARM | Suppresses noisy ABI warnings on cross-compile |
| `-fno-exceptions -fno-rtti` if MCU build does | Match the production firmware's flags so virtual dispatch matches |
| Link with `-Wl,--gc-sections` + compile with `-ffunction-sections -fdata-sections` | Keeps the .elf small enough for low-RAM Cortex-M0 simulation |

## Command-line flags (full set)

Per the Advanced Guide:

| Flag | Effect |
|---|---|
| `--gtest_filter=Pattern` | "a `:`-separated list of wildcard patterns" - supports `*`, `?`, and negative `-` patterns |
| `--gtest_repeat=N` | Repeats all tests N times (use `-1` for infinite - useful for flake hunting) |
| `--gtest_shuffle` | Random order each run - "reveal bad dependencies between tests" |
| `--gtest_output=xml:results.xml` / `json:results.json` | Machine-readable report (the value is `"xml:path"` or `"json:path"`) |
| `--gtest_break_on_failure` | Drops into debugger on first failure |
| `--gtest_catch_exceptions=0` | Disables exception handling - lets debugger catch the throw |
| `--gtest_color=yes\|no\|auto` | Coloured terminal output |
| `--gtest_brief=1` | Only failures shown |
| `--gtest_list_tests` | List without running |

## Parsing results

### XML output schema

Per the Advanced Guide, the XML follows a hierarchical structure with
`<testsuites>` / `<testsuite>` / `<testcase>` elements, with `<failure>` nodes
nested under failing `<testcase>` entries:

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

JUnit-compatible - feeds straight into GitHub Actions
`actions/upload-artifact` + `mikepenz/action-junit-report`.

### JSON output schema

Per the Advanced Guide: a "Proto3-compatible structure with
UnitTest -> TestCase -> TestInfo -> Failure hierarchy, including timestamps and
durations". Prefer JSON for custom dashboards; XML for the JUnit ecosystem.

### Parsing pattern

```bash
./ringbuffer_test --gtest_output=xml:results.xml
xmlstarlet sel -t -v "count(//testcase[failure])" results.xml
# Number of failing testcases - gate on this
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

The host build gates on the JUnit XML; the QEMU build gates on QEMU's exit code
(semihosting `exit(RUN_ALL_TESTS())` propagates the gtest return value through
QEMU).
