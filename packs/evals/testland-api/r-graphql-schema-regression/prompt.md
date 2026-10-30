---
description: Should load graphql-schema-regression when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A pull request changes the GraphQL schema. Add a CI check that diffs it against main and fails on breaking changes.
