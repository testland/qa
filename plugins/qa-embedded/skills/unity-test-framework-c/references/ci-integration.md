# Unity CI integration (standalone, no Ceedling)

Generate runners, build + run on host, then cross-build and run under QEMU:

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

For Ceedling-driven projects, use `ceedling-build-runner` for the canonical `ceedling test:all` + JUnit XML flow.
