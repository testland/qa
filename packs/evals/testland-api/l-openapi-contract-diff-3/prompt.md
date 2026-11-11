---
description: Short prompt that should load openapi-contract-diff with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

A partner's integration broke after we edited our API spec. How do we catch that on the PR?
