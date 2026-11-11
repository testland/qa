---
description: Short prompt that should load prod-canary-validator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How do I decide automatically whether to promote a canary?
