---
description: Short prompt that should load sidekiq-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Sidekiq specs leak jobs between tests and assertions on the queue size are random. How do we fix that?
