---
description: Short prompt that should load msw-handlers with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our React tests only cover the success response, so loading and error states break in production. How do we test them?
