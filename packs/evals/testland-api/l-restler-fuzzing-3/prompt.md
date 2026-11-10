---
description: Short prompt that should load restler-fuzzing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our API returns 500 only after a resource is created, updated and then deleted. Which fuzzer finds that kind of bug?
