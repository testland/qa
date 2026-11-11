---
description: Short prompt that should load golden-file-conventions with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Developers just run `jest -u` whenever a snapshot fails, so our snapshot tests catch nothing. How do we fix the process?
