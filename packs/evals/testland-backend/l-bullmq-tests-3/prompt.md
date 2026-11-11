---
description: Short prompt that should load bullmq-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our BullMQ repeat job sometimes runs twice after a deploy. How do we reproduce that in a test?
