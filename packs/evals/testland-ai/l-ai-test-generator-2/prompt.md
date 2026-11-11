---
description: Short prompt that should load ai-test-generator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Generate tests from these acceptance criteria and flag the ones you're unsure about.

- Given a cart over $100, free shipping applies.
- Given an expired coupon, checkout shows 'Coupon expired'.
- Given a guest user, they can check out without an account.
