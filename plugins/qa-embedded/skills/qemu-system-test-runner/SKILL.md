---
name: qemu-system-test-runner
description: "Author and run QEMU system emulation as an embedded-test target - qemu-system-arm / qemu-system-aarch64 / qemu-system-riscv32 launching cross-compiled ELF binaries on virtual MCUs and SoCs. Covers machine selection (-M virt / mps2-an385 / mps2-an386 / mps2-an500 / mps2-an511 / mps3-an524 / lm3s6965evb / raspi3b / xilinx-zynq-a9), CPU selection (-cpu cortex-m0 / cortex-m3 / cortex-m4 / cortex-m33 / cortex-a15 / cortex-a57 / max), -kernel ELF load, -nographic + -serial stdio, ARM semihosting via -semihosting-config enable=on,target=native (so cross-compiled GoogleTest / Unity binaries print to host stdio and exit with the test return code), GDB stub via -S -gdb tcp::1234, QMP monitor via -qmp tcp:host:port for automated test orchestration, and CI wiring. Use when host-only test runs are insufficient and the team wants arch-correct (endianness / alignment / interrupt-vector) behaviour on a virtual MCU without committing to physical hardware-in-loop."
rating: 24
d6: 4
archetype: S1
keywords: ["qemu", "embedded", "arm", "cortex-m", "cortex-a", "semihosting", "system-emulation", "riscv"]
---

# qemu-system-test-runner

## Overview

QEMU system emulation, per
[www.qemu.org/docs/master/system/](https://www.qemu.org/docs/master/system/),
is the mode "for users using QEMU for full system emulation (as
opposed to user-mode emulation). This includes working with
hypervisors such as KVM, Xen or Hypervisor.Framework". Each
target architecture has a `qemu-system-<arch>` binary - 
`qemu-system-arm`, `qemu-system-aarch64`, `qemu-system-riscv32`,
`qemu-system-riscv64` are the embedded-relevant ones.

For an embedded test pipeline, QEMU sits between the host build
(fast, but misses arch-specific behaviour) and the physical
hardware-in-loop rig (slow, expensive). A cross-compiled
GoogleTest or Unity binary runs under QEMU with semihosting; the
test's `main()` returns the failure count; QEMU exits with that
code; CI gates on it.

Composes with:

- [`googletest-embedded-arm`](../googletest-embedded-arm/SKILL.md) - 
  cross-compiled C++ test binary.
- [`unity-test-framework-c`](../unity-test-framework-c/SKILL.md) - 
  cross-compiled C test binary.
- [`ceedling-build-runner`](../ceedling-build-runner/SKILL.md) - 
  Ceedling project configured for ARM cross-compile.
- [`hardware-in-loop-reference`](../hardware-in-loop-reference/SKILL.md) - 
  the next rung up the V-cycle (PIL / HIL).

## When to use

- Host tests pass but you suspect arch-specific bugs (endianness,
  alignment, interrupt-vector ordering, weak-symbol resolution).
- Physical HIL is expensive / scheduled - QEMU is the V-cycle
  PIL stage between SIL and HIL.
- The team wants reproducible "on-target" tests in CI without
  flashing a real board.
- Cross-compile target is one of QEMU's supported boards
  (Cortex-M3/M4/M7/M33 via mps2-* boards; Cortex-A* via virt /
  raspi / zynq; RISC-V via virt).

QEMU does **not** emulate analog I/O, sensor wiring, or
real-time timing precisely - for that, escalate to a real HIL
rig per
[`hardware-in-loop-reference`](../hardware-in-loop-reference/SKILL.md).

## Authoring

### Machine + CPU selection

Per [www.qemu.org/docs/master/system/target-arm.html](https://www.qemu.org/docs/master/system/target-arm.html),
the ARM machines relevant to embedded testing include
mps2-an385, mps2-an386, mps2-an500, mps2-an505, mps2-an511,
mps2-an521, mps3-an524, mps3-an536, mps3-an547, the Stellaris
lm3s6965evb / lm3s811evb, Raspberry Pi raspi0 / raspi1ap /
raspi2b / raspi3ap / raspi3b / raspi4b, and Xilinx
xilinx-zynq-a9 / xlnx-zcu102. The **virt** board, per the same
docs, is "a platform which doesn't correspond to any real
hardware and is designed for use in virtual machines".

| Test target | QEMU command | Typical `-cpu` |
|---|---|---|
| Cortex-M0 / M0+ | `qemu-system-arm -M mps2-an385` | `cortex-m0` |
| Cortex-M3 | `qemu-system-arm -M mps2-an385` | `cortex-m3` (board default) |
| Cortex-M4 | `qemu-system-arm -M mps2-an386` | `cortex-m4` |
| Cortex-M7 | `qemu-system-arm -M mps2-an500` | `cortex-m7` |
| Cortex-M33 (TrustZone-M) | `qemu-system-arm -M mps2-an505 / mps2-an521 / mps3-an524` | `cortex-m33` |
| Cortex-A15 / A57 | `qemu-system-arm -M virt` (32-bit) / `qemu-system-aarch64 -M virt` (64-bit) | `cortex-a15` / `cortex-a57` / `max` |
| Stellaris LM3S6965 (older M3 reference) | `qemu-system-arm -M lm3s6965evb` | implicit |
| Raspberry Pi 3B (Cortex-A53) | `qemu-system-aarch64 -M raspi3b` | implicit (`cortex-a53`) |

Per [www.qemu.org/docs/master/system/arm/cpu-features.html](https://www.qemu.org/docs/master/system/arm/cpu-features.html),
"Named CPU models generally do not work with KVM" - for
emulation-only test runs (not KVM-accelerated) the named models
work fine. The special **`max` CPU type** is "available for
comprehensive feature testing".

### Booting the test ELF

Per [www.qemu.org/docs/master/system/invocation.html](https://www.qemu.org/docs/master/system/invocation.html):

| Flag | Effect |
|---|---|
| `-M [type=]name[,prop=value,...]` | Select emulated machine; `-machine help` lists all |
| `-cpu model` | Select CPU model; `-cpu help` lists models for the target |
| `-smp [cpus=]n[,cores=...,...]` | SMP topology - for multi-core test targets |
| `-m [size=]megs[,slots=n,maxmem=size]` | Guest RAM; M / G suffixes |
| `-kernel file` | Kernel image loaded directly into guest memory - for embedded tests, this is the test ELF |
| `-bios file` | Custom BIOS / ROM image |
| `-append "<string>"` | Kernel command-line arguments (Linux targets) |
| `-nographic` | No GUI; serial → console |
| `-serial stdio` | Redirect serial port to host stdin / stdout |
| `-monitor stdio` / `-monitor tcp:host:port` | QEMU human monitor |
| `-qmp tcp:host:port[,server,nowait]` | QMP machine protocol over TCP - JSON-RPC |

### ARM semihosting

The critical flag for cross-compiled test binaries:

```
-semihosting-config [enable=on|off][,target=native|gdb|auto][,chardev=name][,arg=string]
```

Per the same invocation page, semihosting "allows direct host
system calls and I/O operations". When the test ELF was linked
with `--specs=rdimon.specs`, `printf` and `exit()` from the
binary go through ARM semihosting calls; with
`-semihosting-config enable=on,target=native` QEMU services those
calls against the host.

Practically: the test binary's `main()` returns the failure
count; the C runtime calls `_exit(rc)`; QEMU exits with `rc`. CI
gates on `$?`.

## Building (the test binary side)

The test side is covered in
[`googletest-embedded-arm`](../googletest-embedded-arm/SKILL.md)
and
[`unity-test-framework-c`](../unity-test-framework-c/SKILL.md);
the canonical Cortex-M4 build:

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O0 -g \
    --specs=rdimon.specs \
    test/test_ringbuffer.c test/test_ringbuffer_Runner.c \
    src/ringbuffer.c ext/Unity/src/unity.c \
    -o build/test.elf -lrdimon
```

`-lrdimon` links the ARM semihosting library
([developer.arm.com GNU Toolchain](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain)).
`--specs=rdimon.specs` pulls in startup code that wires `printf`
/ `_write` / `_exit` to the semihosting interface.

## Running

### Smoke run

```bash
qemu-system-arm -M mps2-an386 -cpu cortex-m4 \
    -nographic \
    -semihosting-config enable=on,target=native \
    -kernel build/test.elf
```

Output (Unity-style):

```
test/test_ringbuffer.c:34:test_ringbuffer_initially_empty:PASS
test/test_ringbuffer.c:42:test_ringbuffer_push_increments_size:PASS

-----------------------
2 Tests 0 Failures 0 Ignored
OK
```

Exit code: 0 (or the failure count for Unity / GoogleTest).

### Inspecting boot / interrupt behaviour

Per the invocation page, `-d` "activates debug logging for
specified subsystems":

```bash
qemu-system-arm -M mps2-an386 -cpu cortex-m4 \
    -nographic -semihosting-config enable=on,target=native \
    -d int,cpu_reset,unimp \
    -kernel build/test.elf 2> qemu-debug.log
```

`-d help` lists the available items. `int` traces interrupts;
`cpu_reset` traces resets; `unimp` traces unimplemented
features (board-quirk hunts).

### GDB-attached debug

```bash
# Terminal 1
qemu-system-arm -M mps2-an386 -cpu cortex-m4 -nographic \
    -semihosting-config enable=on,target=native \
    -S -gdb tcp::1234 \
    -kernel build/test.elf

# Terminal 2
arm-none-eabi-gdb build/test.elf \
    -ex "target remote :1234" \
    -ex "b main" \
    -ex "continue"
```

`-S` "freezes the CPU at startup"; `-gdb tcp::1234` "opens a GDB
stub on the specified device" (per the invocation page).

### QMP for automated orchestration

Per the same invocation reference, `-qmp tcp:host:port[,server,
nowait]` exposes the QEMU Machine Protocol over TCP as JSON-RPC.
For a CI orchestration that needs to inject faults mid-test:

```bash
qemu-system-arm -M mps2-an386 -cpu cortex-m4 -nographic \
    -semihosting-config enable=on,target=native \
    -qmp tcp:localhost:4444,server,nowait \
    -kernel build/test.elf
```

A test harness then connects to `localhost:4444` and issues
`{"execute":"query-status"}`, `{"execute":"stop"}`,
`{"execute":"cont"}` - useful for staged fault injection that
mirrors the [HIL fault-injection patterns](../hardware-in-loop-reference/SKILL.md#fault-injection-patterns).

## Parsing results

### Exit code (primary signal)

Semihosting's `_exit(rc)` propagates `rc` through QEMU. A test
binary linked with `--specs=rdimon.specs` and ending in:

```c
int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_x);
    return UNITY_END();   /* failure count */
}
```

…makes `qemu-system-arm ... -kernel test.elf; echo $?` return
the failure count. CI gates on the exit code directly.

### stdout parsing

For Unity / GoogleTest, the canonical line format reaches host
stdout via semihosting → QEMU stdio. Grep / tee / pipe-to-JUnit
the same way as a host run - see
[`unity-test-framework-c`](../unity-test-framework-c/SKILL.md#parsing-results)
and
[`googletest-embedded-arm`](../googletest-embedded-arm/SKILL.md#parsing-results).

### Timing the run

QEMU emulation is not real-time. For a test that asserts on
wall-clock latency, the result is **wrong** - QEMU executes
faster than physical hardware for compute-bound code and slower
for I/O-heavy code. For real-time-sensitive tests, escalate to
[`hardware-in-loop-reference`](../hardware-in-loop-reference/SKILL.md).

## CI integration

GitHub Actions:

```yaml
jobs:
  qemu-arm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Install toolchain
        run: |
          sudo apt-get update
          sudo apt-get install -y gcc-arm-none-eabi qemu-system-arm
      - name: Cross-build test binary
        run: |
          arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O0 -g \
              --specs=rdimon.specs \
              -I src -I ext/Unity/src \
              src/*.c ext/Unity/src/unity.c \
              test/test_*.c test/*_Runner.c \
              -o build/test.elf -lrdimon
      - name: Run under QEMU (mps2-an386 / cortex-m4)
        run: |
          qemu-system-arm -M mps2-an386 -cpu cortex-m4 \
              -nographic \
              -semihosting-config enable=on,target=native \
              -kernel build/test.elf | tee build/qemu.log
          # exit code is the Unity failure count (semihosting _exit)
      - name: Also run under Cortex-M0 for ABI sanity
        run: |
          arm-none-eabi-gcc -mcpu=cortex-m0 -mthumb -O0 -g \
              --specs=rdimon.specs \
              -I src -I ext/Unity/src \
              src/*.c ext/Unity/src/unity.c \
              test/test_*.c test/*_Runner.c \
              -o build/test-m0.elf -lrdimon
          qemu-system-arm -M mps2-an385 -cpu cortex-m0 \
              -nographic -semihosting-config enable=on,target=native \
              -kernel build/test-m0.elf
```

The "run under multiple CPUs" pattern is the cheap-as-chips way
to catch CPU-feature regressions - float vs no-float, ARMv6-M vs
ARMv7-M.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Forgetting `-semihosting-config enable=on,target=native` | Test prints nothing; QEMU never exits | Always set both `-semihosting-config enable=on` and `target=native` (or `auto`) |
| `-kernel` pointed at a stripped binary | QEMU loads but symbol info gone for debug | Keep `-g` debug info; strip only the release binary |
| Asserting on wall-clock timing under QEMU | QEMU is not real-time | Move timing assertions to HIL; QEMU asserts only logical correctness |
| Using `-M virt` for a Cortex-M test | virt is Cortex-A - wrong instruction set | Match machine to CPU profile (mps2-* for M-profile, virt for A-profile) |
| Not pinning the QEMU version | Newer QEMU may emulate differently; CI flakes | Pin `qemu-system-arm` version in the runner image |
| Skipping `-cpu` and relying on board default | Board defaults shift between QEMU versions | Always specify `-cpu` explicitly |
| Reading `-monitor stdio` and `-nographic` together without `-serial mon:stdio` | Serial and monitor share stdio; output garbles | Use `-monitor none -serial stdio` for clean output |
| Running QEMU in CI without a sane timeout | A hung test ELF runs forever | Wrap in `timeout 60 qemu-system-arm ...` |

## Limitations

- **Not real-time.** Per the QEMU docs (system overview),
  emulation timing is not deterministic. Use only for logical
  correctness; HIL for timing.
- **Peripheral coverage varies by board.** Per the ARM target
  page, mps2-* boards expose a specific set of peripherals
  (UART, timer, GPIO via PL061); custom MCU peripherals are
  **not** modelled. If the test exercises an STM32 USART, you
  must mock the peripheral or use a real board.
- **No analog I/O.** No ADC, no DAC, no electrical-level fault
  injection. That's strictly HIL territory.
- **`max` CPU diverges from production.** The `max` CPU is per
  the cpu-features page "available for comprehensive feature
  testing"; passing on `max` does **not** mean passing on the
  production part.
- **QMP is structured but not stable across major QEMU
  versions.** Pin the QEMU version in CI if you script QMP.
- **Semihosting has security implications on real hardware.**
  In production firmware never link `--specs=rdimon.specs`; the
  semihosting bkpt is a debug-only path.

## References

Cited inline. Foundational documents:

- QEMU System Emulation overview - [www.qemu.org/docs/master/system/](https://www.qemu.org/docs/master/system/).
- QEMU invocation flags - [www.qemu.org/docs/master/system/invocation.html](https://www.qemu.org/docs/master/system/invocation.html).
- QEMU ARM target machines - [www.qemu.org/docs/master/system/target-arm.html](https://www.qemu.org/docs/master/system/target-arm.html).
- QEMU ARM CPU features (`max`, named CPUs) - [www.qemu.org/docs/master/system/arm/cpu-features.html](https://www.qemu.org/docs/master/system/arm/cpu-features.html).
- ARM GNU Toolchain (`--specs=rdimon.specs`, semihosting) - [developer.arm.com Tools and Software / GNU Toolchain](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain).
- Sibling skills:
  [`googletest-embedded-arm`](../googletest-embedded-arm/SKILL.md),
  [`unity-test-framework-c`](../unity-test-framework-c/SKILL.md),
  [`ceedling-build-runner`](../ceedling-build-runner/SKILL.md),
  [`hardware-in-loop-reference`](../hardware-in-loop-reference/SKILL.md),
  [`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md).
