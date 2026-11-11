---
description: Short prompt that should load graphql-schema-regression with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

A frontend broke after we renamed a GraphQL field. How do we catch that on the PR?
