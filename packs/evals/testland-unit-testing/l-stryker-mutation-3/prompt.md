---
description: Short prompt that should load stryker-mutation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Coverage on our React app is 92% and bugs still slip through. How do I find the weak tests?
