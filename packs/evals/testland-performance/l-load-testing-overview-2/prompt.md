---
description: Short prompt that should load load-testing-overview with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We need to load test a REST API before Black Friday: expected peak 3,000 requests per second, the team writes Python and TypeScript. Pick a tool, the load profile and pass/fail criteria.
