---
description: Short prompt that should delegate to the visual-baseline-curator agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Which pages and viewports should get visual regression baselines first in our Playwright suite?
