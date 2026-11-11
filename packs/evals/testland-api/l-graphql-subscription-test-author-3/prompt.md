---
description: Short prompt that should load graphql-subscription-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our GraphQL subscription works in the browser but we have zero tests for it. How do we test it over graphql-ws?
