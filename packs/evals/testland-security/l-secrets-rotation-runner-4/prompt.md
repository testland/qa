---
description: Held-out short prompt that should load secrets-rotation-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt, held-out]
---

Someone pasted our Slack bot token in a public issue. What steps do we take?
