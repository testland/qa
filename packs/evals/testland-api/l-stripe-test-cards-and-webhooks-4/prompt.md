---
description: Short prompt that should load stripe-test-cards-and-webhooks with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Which Stripe card number gives an insufficient funds decline?
