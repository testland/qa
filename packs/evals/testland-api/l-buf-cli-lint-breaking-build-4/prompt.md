---
description: Short prompt that should load buf-cli-lint-breaking-build with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

buf lint says FIELD_LOWER_SNAKE_CASE. How do I fix or disable that?
