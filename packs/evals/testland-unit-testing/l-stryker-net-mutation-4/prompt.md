---
description: Short prompt that should load stryker-net-mutation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How do we know if our NUnit tests would catch a changed `>` to `>=` in C#?
