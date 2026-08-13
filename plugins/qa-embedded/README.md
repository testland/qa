# qa-embedded

Embedded C/C++ testing: GoogleTest on ARM, ThrowTheSwitch Unity-C and Ceedling with CMock mocks, gcov coverage, QEMU system emulation

## Choosing a framework

Read down the "Signal" column and stop at the first row that matches your
project - never infer from a README or folder name alone:

| Signal in project root | Framework | Execution path | Start with |
|---|---|---|---|
| Top-level Ceedling `project.yml` | **Unity + Ceedling** (existing stack) | host build; add QEMU if the build cross-compiles | `ceedling-build-runner` |
| `CMakeLists.txt` with `find_package(GTest)` or a `gtest_main` link target | **GoogleTest** | host build + QEMU cross-compile under `arm-none-eabi-g++` | `googletest-embedded-arm` |
| Only `*.c` / `*.h` files, no harness yet | **Unity + Ceedling** (canonical ThrowTheSwitch setup; Ceedling documents no C++ support) | host build (fast loop) + QEMU for arch sanity | `ceedling-build-runner` |
| Any `*.cpp` / `*.cc` / `*.cxx` (incl. mixed C/C++ - a C++ toolchain compiles both) | **GoogleTest** | host build + QEMU when cross-compiling | `googletest-embedded-arm` |
| Ultra-low-RAM target confirmed by `-mcpu=cortex-m0` / `cortex-m0plus` (8-16 KB) | **Unity standalone** (no Ceedling; GoogleTest's heap requirement precludes it) | host build + optional QEMU | `unity-test-framework-c` |

Execution-path tie-breakers: no cross-compile toolchain in the build file →
host build only; `arm-none-eabi-*` detected with no physical board → host +
QEMU (endianness / alignment / interrupt-vector sanity per
[qemu-system-test-runner](skills/qemu-system-test-runner/SKILL.md)); physical
board access confirmed → host + QEMU + on-target, with the coverage artefact
from the on-target build per
[embedded-coverage-strategy-reference](skills/embedded-coverage-strategy-reference/SKILL.md).
A safety standard (DO-178C, ISO 26262, IEC 62304, MISRA-C) sets the minimum
structural-coverage level - see the same coverage skill.

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | [embedded-coverage-strategy-reference](skills/embedded-coverage-strategy-reference/SKILL.md) | Coverage criteria, gcov + llvm-cov toolchains, MISRA / DO-178C / ISO 26262 expectations |
| skill | [hardware-in-loop-reference](skills/hardware-in-loop-reference/SKILL.md) | HIL pattern, MIL/SIL/PIL/HIL V-cycle, vendor stack (NI / dSPACE / Vector / Speedgoat), bus emulation, fault injection, DO-178C / ISO 26262 alignment |
| skill | [googletest-embedded-arm](skills/googletest-embedded-arm/SKILL.md) | GoogleTest 1.17+ for embedded C++ on ARM: TEST/TEST_F/TEST_P/TYPED_TEST, EXPECT vs ASSERT, cross-compile with arm-none-eabi-g++, QEMU run, XML/JSON output |
| skill | [unity-test-framework-c](skills/unity-test-framework-c/SKILL.md) | ThrowTheSwitch Unity for pure-C unit tests (8-bit through 64-bit). Distinct from the Unity game-engine Test Framework at docs.unity3d.com |
| skill | [ceedling-build-runner](skills/ceedling-build-runner/SKILL.md) | Ceedling build orchestration: project.yml schema, ceedling new / test:all / gcov:all / release tasks, JUnit XML + gcov plugins, CI wiring; CMock semantics (Expect / Ignore / ReturnThruPtr / Stub / Callback API, cmock.yml :plugins, teardown verification) in references/cmock.md |
| skill | [qemu-system-test-runner](skills/qemu-system-test-runner/SKILL.md) | QEMU system emulation for embedded tests: mps2-* / virt / lm3s6965evb boards, -kernel ELF, ARM semihosting, GDB stub, QMP, CI integration |
| agent | [embedded-test-author](agents/embedded-test-author.md) | Authors embedded C/C++ unit tests end to end: detects the framework + execution path from the project root per the decision table above, scaffolds the harness from zero when none exists (Ceedling project.yml tree or CMake FetchContent GoogleTest wiring, failing INPUT NEEDED placeholders), then emits one test per spec in Unity / GoogleTest / Ceedling-Unity with CMock auto-mocks; pairs with QEMU for cross-compiled runs |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-embedded@testland-qa
```
