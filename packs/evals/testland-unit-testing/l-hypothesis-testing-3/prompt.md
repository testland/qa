---
description: Short prompt that should load hypothesis-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Python CSV parser breaks on weird inputs users send. How can I find those inputs before they do?
