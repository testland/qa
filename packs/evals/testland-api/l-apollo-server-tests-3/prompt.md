---
description: Short prompt that should load apollo-server-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Apollo GraphQL API had introspection enabled in production. How do we test that config?
