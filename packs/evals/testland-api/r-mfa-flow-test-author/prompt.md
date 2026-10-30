---
description: Should load mfa-flow-test-author when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write automated tests for a login flow with TOTP two-factor authentication, including recovery codes, without a real phone.
