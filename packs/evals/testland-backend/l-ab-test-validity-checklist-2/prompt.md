---
description: Short prompt that should load ab-test-validity-checklist with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Review this experiment plan: test a new pricing page, 50/50 split by session, primary metric 'clicks on Buy', run until it looks significant.
