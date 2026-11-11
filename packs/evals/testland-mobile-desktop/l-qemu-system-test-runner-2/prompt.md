---
description: Short prompt that should load qemu-system-test-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Run this Cortex-M test binary in QEMU and return the exit code to CI.

```bash
arm-none-eabi-gcc -mcpu=cortex-m3 -o test.elf test_main.c unity.c
```
