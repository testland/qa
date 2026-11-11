---
description: Short prompt that should load trace-spec-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

During our last incident the traces had no tenant or order IDs, so debugging took hours. How do we agree on what to instrument?
