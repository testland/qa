---
description: Short prompt that should load sqs-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

One bad message keeps coming back to our SQS queue and blocks everything. How do we test the dead-letter setup?
