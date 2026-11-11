---
description: Short prompt that should load feature-flag-test-harness with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Run our checkout tests with these flags on and off without testing every combination: new_checkout, apple_pay, address_autocomplete.
