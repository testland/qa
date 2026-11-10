---
description: Short prompt that should load dotnet-unit-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

My xUnit tests share state and fail when run together but pass alone. How do I fix that?
