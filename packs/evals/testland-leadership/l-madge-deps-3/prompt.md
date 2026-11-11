---
description: Short prompt that should load madge-deps with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We want CI to block any PR that adds a new import cycle in our TypeScript monorepo. How?
