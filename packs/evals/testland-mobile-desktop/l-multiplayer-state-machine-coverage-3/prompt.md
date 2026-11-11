---
description: Short prompt that should load multiplayer-state-machine-coverage with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our multiplayer game breaks when the host leaves mid-match, and it failed cert last time. How do we cover these cases systematically?
