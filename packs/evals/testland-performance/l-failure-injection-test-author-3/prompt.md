---
description: Short prompt that should load failure-injection-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We had an incident where a slow upstream plus a malformed reply crashed our service, and we can't reproduce it with mocks alone. How do we?
