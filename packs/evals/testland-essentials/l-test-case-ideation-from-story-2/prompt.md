---
description: Short prompt that should load test-case-ideation-from-story with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write test cases for this story: 'As a shopper I can apply one discount code at checkout. Codes can expire and some only work above a minimum order value.'
