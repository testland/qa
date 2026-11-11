---
description: Short prompt that should load pii-masking-pipeline-builder with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We copy production to QA every month and it still has real emails and phone numbers. How do we build a masking pipeline?
