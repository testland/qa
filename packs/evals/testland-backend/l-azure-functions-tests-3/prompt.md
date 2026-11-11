---
description: Short prompt that should load azure-functions-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Azure Function works locally but fails after deploy because a binding setting is wrong. How do we catch that before deploying?
