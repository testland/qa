# qa-embedded

Embedded C/C++ testing: GoogleTest on ARM, ThrowTheSwitch Unity-C and Ceedling, gcov coverage, QEMU system emulation

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | embedded-coverage-strategy-reference | Coverage criteria, gcov + llvm-cov toolchains, MISRA / DO-178C / ISO 26262 expectations |
| skill | hardware-in-loop-reference | HIL pattern, MIL/SIL/PIL/HIL V-cycle, vendor stack (NI / dSPACE / Vector / Speedgoat), bus emulation, fault injection, DO-178C / ISO 26262 alignment |
| skill | ceedling-mocks-reference | CMock generated API surface (Expect / Ignore / ReturnThruPtr / Stub / Callback), cmock.yml :plugins, Unity teardown verification, strict vs ignore matching |
| skill | googletest-embedded-arm | GoogleTest 1.17+ for embedded C++ on ARM: TEST/TEST_F/TEST_P/TYPED_TEST, EXPECT vs ASSERT, cross-compile with arm-none-eabi-g++, QEMU run, XML/JSON output |
| skill | unity-test-framework-c | ThrowTheSwitch Unity for pure-C unit tests (8-bit through 64-bit). Distinct from the Unity game-engine Test Framework at docs.unity3d.com |
| skill | ceedling-build-runner | Ceedling build orchestration: project.yml schema, ceedling new / test:all / gcov:all / release tasks, JUnit XML + gcov plugins, CI wiring |
| skill | qemu-system-test-runner | QEMU system emulation for embedded tests: mps2-* / virt / lm3s6965evb boards, -kernel ELF, ARM semihosting, GDB stub, QMP, CI integration |
| agent | embedded-test-author | Authors one embedded C/C++ unit test per spec - detects Ceedling / CMake+GoogleTest / bare Makefile from the project root, picks Unity / GoogleTest / Ceedling-Unity, pairs with QEMU for cross-compiled runs |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-embedded@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
