---
description: Short prompt that should load contract-compatibility-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We have Pact for REST, a GraphQL schema and .proto files. Write one CI job that blocks deploy on any breaking change.
