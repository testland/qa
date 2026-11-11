---
description: Short prompt that should load graphql-complexity-limit-tester with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

A pentest found that one GraphQL query can take down our API. How do we test the limits?
