---
description: Short prompt that should load serverless-integration-test-builder with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Lambda functions time out in production on cold starts but tests never show it. How do we test for that?
