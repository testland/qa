---
description: Short prompt that should load flake-pattern-reference with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our API tests fail with EADDRINUSE only when test files run in parallel. Why?
