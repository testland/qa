---
description: Held-out short prompt that should load madge-deps with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt, held-out]
---

How do I see a graph of which modules import which in our TypeScript app?
