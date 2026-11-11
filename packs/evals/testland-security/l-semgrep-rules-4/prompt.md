---
description: Held-out short prompt that should load semgrep-rules with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt, held-out]
---

How do I ignore a single Semgrep finding in the code?
