---
description: Should load dbt-testing when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Add data tests to a dbt project: unique and not-null keys, accepted values for order status, and a CI step that fails the build when any test fails.
