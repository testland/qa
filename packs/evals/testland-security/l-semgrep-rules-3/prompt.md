---
description: Short prompt that should load semgrep-rules with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We want static analysis on every PR but our CodeQL builds take 40 minutes. What's lighter?
