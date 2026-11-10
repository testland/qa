---
description: Short prompt that should load pitest-mutation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How can I check whether our JUnit tests actually catch bugs, not just run the code?
