---
description: Short prompt that should load js-unit-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

My Jest tests fail with `Cannot find module '@/utils/date'` but the app builds fine. Why?
