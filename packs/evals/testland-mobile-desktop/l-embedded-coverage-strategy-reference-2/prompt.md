---
description: Short prompt that should load embedded-coverage-strategy-reference with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our firmware is DO-178C Level B. What coverage do we need and how do we measure it with gcov on QEMU?
