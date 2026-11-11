---
description: Short prompt that should delegate to the mobile-test-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Author an end-to-end test for our Flutter app's onboarding screens.
