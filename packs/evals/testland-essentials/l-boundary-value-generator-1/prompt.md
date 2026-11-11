---
description: Short prompt that should load boundary-value-generator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

What boundary values should I test for a field that accepts 1 to 100?
