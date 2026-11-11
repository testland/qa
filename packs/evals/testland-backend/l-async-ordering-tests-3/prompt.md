---
description: Short prompt that should load async-ordering-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our asyncio code sometimes processes events out of order under load. How do we write a deterministic test for that?
