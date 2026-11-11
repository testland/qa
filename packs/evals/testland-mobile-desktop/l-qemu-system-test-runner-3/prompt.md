---
description: Short prompt that should load qemu-system-test-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our tests pass on x86 but fail on the device because of endianness. How do we test on an emulated target in CI?
