---
description: Short prompt that should load openapi-contract-diff with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Is adding a required query parameter to an existing endpoint a breaking change?
