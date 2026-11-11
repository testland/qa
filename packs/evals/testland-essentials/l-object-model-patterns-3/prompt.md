---
description: Short prompt that should load object-model-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our page objects have grown to 2,000 lines each and every test change touches five of them. What pattern scales better?
