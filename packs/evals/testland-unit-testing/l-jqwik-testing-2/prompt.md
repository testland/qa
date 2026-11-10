---
description: Short prompt that should load jqwik-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write jqwik properties for a Java `Money.add` method: commutative, and adding zero changes nothing.
