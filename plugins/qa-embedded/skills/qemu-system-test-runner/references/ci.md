# QEMU CI integration (GitHub Actions)

The SKILL spine keeps the smoke run; the full pipeline installs the toolchain, cross-builds, and runs the binary under two CPU profiles:

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

The "run under multiple CPUs" pattern is the cheap way to catch CPU-feature regressions - float vs no-float, ARMv6-M vs ARMv7-M.
