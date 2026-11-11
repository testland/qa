---
description: Short prompt that should load detox-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our React Native E2E tests are flaky because they tap before animations finish. Is there a tool that syncs with the app?
