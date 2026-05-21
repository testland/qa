# qa-embedded

Embedded C/C++ testing: GoogleTest on ARM, ThrowTheSwitch Unity-C and Ceedling, gcov coverage, QEMU system emulation

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | embedded-coverage-strategy-reference | S2 | Coverage criteria, gcov + llvm-cov toolchains, MISRA / DO-178C / ISO 26262 expectations |
| skill | hardware-in-loop-reference | S2 | HIL pattern, MIL/SIL/PIL/HIL V-cycle, vendor stack (NI / dSPACE / Vector / Speedgoat), bus emulation, fault injection, DO-178C / ISO 26262 alignment |
| skill | ceedling-mocks-reference | S2 | CMock generated API surface (Expect / Ignore / ReturnThruPtr / Stub / Callback), cmock.yml :plugins, Unity teardown verification, strict vs ignore matching |
| skill | googletest-embedded-arm | S1 | GoogleTest 1.17+ for embedded C++ on ARM: TEST/TEST_F/TEST_P/TYPED_TEST, EXPECT vs ASSERT, cross-compile with arm-none-eabi-g++, QEMU run, XML/JSON output |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-embedded@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
