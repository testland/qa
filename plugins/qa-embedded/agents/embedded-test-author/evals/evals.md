---
component: embedded-test-author
type: agent
archetype: A2
---

# embedded-test-author — evals

Companion eval cases for [`embedded-test-author`](../../embedded-test-author.md).
Three cases covering happy path + branch + adversarial. Re-run by feeding the
**Input** block as the first user message to the agent and comparing the emitted
test file against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Run dates recorded below are the eval-authoring date — each
eval is designed to be re-run against each tier.

## Eval 1 — happy path — Ceedling project.yml + Unity → test/test_sensor.c + TEST_ASSERT_EQUAL_INT

**Input:**

```
Author one embedded C unit test for this target callable.

Target source + function signature:
  sensor.c  →  int sensor_read(uint8_t channel)
  (declared in src/sensor.h)
Behavior spec: "Given a channel value greater than the max valid channel
                (max = 7), when sensor_read is called, then it returns 0."
Project root: . (Ceedling layout)

project.yml (excerpt):
:project:
  :use_test_preprocessor: TRUE
:paths:
  :source:
    - src/**
  :test:
    - test/**
:tools:
  :test_compiler:
    :executable: gcc
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24), opus (2026-05-24)

**Expected:** Detects Ceedling (top-level `project.yml`). Detects host-side
toolchain (`gcc`, not `arm-none-eabi-gcc`). Emits ONE test file at
`test/test_sensor.c` with `#include "unity.h"`, `#include "sensor.h"`, empty
`void setUp(void)` / `void tearDown(void)`, a function
`void test_sensor_read_returns_zero_for_invalid_channel(void)`, and the
assertion `TEST_ASSERT_EQUAL_INT(0, sensor_read(99))` (or any channel > 7).
Does NOT emit an `int main(void)` runner — Ceedling auto-generates it. Does
NOT introduce GoogleTest (`TEST(`, `EXPECT_EQ`, `gtest/gtest.h`) or modify
production `src/sensor.c`.

**Pass condition:** Output filename ends in `test_sensor.c` under `test/`.
Output contains `#include "unity.h"` AND `void test_` AND `TEST_ASSERT_EQUAL_INT`
AND `sensor_read(`. Output does NOT contain `gtest/gtest.h`, `TEST(`,
`EXPECT_EQ`, OR an `int main(` block.

## Eval 2 — branch — CMake with find_package(GTest) + C++ → tests/sensor_test.cpp + EXPECT_EQ

**Input:**

```
Author one embedded C++ unit test for this target callable.

Target source + function signature:
  sensor.cpp  →  int sensor_read(uint8_t channel)
  (declared in include/sensor.h, free function in the sensor namespace)
Behavior spec: "Given a channel value greater than the max valid channel
                (max = 7), when sensor_read is called, then it returns 0."
Project root: . (CMake layout; no Ceedling project.yml present)

CMakeLists.txt (excerpt):
cmake_minimum_required(VERSION 3.20)
project(sensor_fw LANGUAGES CXX)
set(CMAKE_CXX_COMPILER g++)
find_package(GTest REQUIRED)
enable_testing()
add_executable(sensor_test tests/sensor_test.cpp src/sensor.cpp)
target_link_libraries(sensor_test PRIVATE GTest::gtest_main)
add_test(NAME sensor_test COMMAND sensor_test)
```

**Target models:** sonnet (2026-05-24), haiku (2026-05-24)

**Expected:** Detects GoogleTest (CMakeLists.txt with `find_package(GTest)`).
Switches from the C/Unity default to GoogleTest. Emits ONE test file at
`tests/sensor_test.cpp` with `#include <gtest/gtest.h>`, a `TEST(SensorTest,
ReadReturnsZeroForInvalidChannel)` block, and `EXPECT_EQ(0, sensor_read(99))`
(or any channel > 7). Does NOT introduce Unity (`TEST_ASSERT_EQUAL_INT`,
`#include "unity.h"`, `void setUp`) or write its own `int main()` — the
project links against `gtest_main` per the GoogleTest primer.

**Pass condition:** Output filename ends in `sensor_test.cpp` under `tests/`.
Output contains `#include <gtest/gtest.h>` AND `TEST(` AND `EXPECT_EQ(` AND
`sensor_read(`. Output does NOT contain `#include "unity.h"`,
`TEST_ASSERT_EQUAL_INT`, OR `void setUp(`.

## Eval 3 — adversarial — spec requests hardware-in-loop verification → refuse, defer to HIL reference

**Input:**

```
Author one embedded C unit test for this target callable.

Target source + function signature:
  thermo.c  →  float thermo_read_celsius(void)
  (declared in src/thermo.h, drives a real MAX31855 thermocouple board over SPI)
Behavior spec: "Verify that reading from the actual MAX31855 thermocouple
                board on the dev kit returns a value within 0.5 C of a
                NIST-traceable reference thermometer placed in the same
                bath. Test must run on the physical hardware target, not in
                an emulator."
Project root: . (Ceedling project.yml present)
```

**Target models:** sonnet (2026-05-24)

**Expected:** Refuses to author. Detects the hardware-in-loop phrasing
("actual MAX31855 ... physical hardware target ... not in an emulator")
which is HIL scope, not unit-test scope. Recommends the
`hardware-in-loop-reference` skill (or the HIL term) for the setup. Does
NOT silently downgrade the HIL scenario to a host-side mock test (that
would lose the original spec's intent — a host mock cannot verify a
NIST-traceable physical reading).

**Pass condition:** Output does NOT contain a generated test method body
(no `void test_` function that calls `thermo_read_celsius` and asserts on
the return value, AND no `TEST(` block doing the same). Output contains
at least one of `hardware-in-loop-reference` / `HIL` / `hardware-in-loop`
AND explains why this is out of scope for a unit test.

## Reproducibility notes

- Inputs are concrete file contents inlined above; no external fixtures.
- Pass conditions are string-match checks on the emitted test file content
  (or, for Eval 3, on the agent's refuse-to-proceed message).
- The agent's tool surface (`Write`, `Edit`, `Bash(make *)` / `Bash(ceedling *)` /
  `Bash(arm-none-eabi-* *)` / `Bash(qemu-system-arm *)`) writes only into the
  project's `test/` or `tests/` tree per the detected layout; eval re-runs must
  not modify production C/C++ source.
- Eval cases were authored 2026-05-24 against the v3.0 framework's D7 sub-checks
  (≥3 cases, ≥1 adversarial, concrete pass conditions).
