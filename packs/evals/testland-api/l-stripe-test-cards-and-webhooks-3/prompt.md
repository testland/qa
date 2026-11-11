---
description: Short prompt that should load stripe-test-cards-and-webhooks with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our checkout breaks for cards that need 3D Secure. How do we test that path?
