---
description: Short prompt that should load knip-dead-code with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our package.json has 80 dependencies and nobody can explain half of them. How do we find the unused ones?
