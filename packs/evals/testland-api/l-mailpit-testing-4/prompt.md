---
description: Short prompt that should load mailpit-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How can I check in a test that a welcome email was sent with the right name?
