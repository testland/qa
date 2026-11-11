---
description: Short prompt that should load fake-clock-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our tests that check token expiry are slow because they sleep, and they still fail sometimes. How do we fix them?
