---
description: Should load schemathesis-fuzzing when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

We have an OpenAPI spec for our REST API. Fuzz the API from the spec to find 500 errors and responses that don't match the schema.
