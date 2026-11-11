---
description: Short prompt that should load tenant-onboarding-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

When a customer cancels, some of their data stays in our system. How do we test that offboarding deletes everything?
