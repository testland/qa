---
description: Short prompt that should load percy-visual-regression-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Percy shows diffs on every build because of the date in our footer. How do I ignore that part?
