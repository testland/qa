---
description: Short prompt that should load ab-test-validity-checklist with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our A/B test showed 52% of users in variant B even though we set a 50/50 split. Is the test broken?
