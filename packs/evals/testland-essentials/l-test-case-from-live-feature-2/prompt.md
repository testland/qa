---
description: Short prompt that should load test-case-from-live-feature with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

There's no story for this, just the live page: a 'Share report' dialog with an email field, a 'Can edit' checkbox, an expiry dropdown (1 day, 7 days, never) and a Send button. Write the test cases.
