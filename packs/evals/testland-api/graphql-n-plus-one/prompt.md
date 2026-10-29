---
description: Should load graphql-n-plus-one-remediation when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Our GraphQL `orders { items { product } }` query fires one SQL query per item. Write a test that catches this and fix it.
