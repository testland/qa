---
description: Short prompt that should delegate to the bug-repro-builder agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Build a minimal repro for this bug: exporting a report with an emoji in the title crashes the PDF generator.
