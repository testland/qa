---
description: Short prompt that should delegate to the pwa-test-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Author tests for our service worker update flow: new version available, user clicks reload.
