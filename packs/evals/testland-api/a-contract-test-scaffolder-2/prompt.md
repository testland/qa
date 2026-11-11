---
description: Short prompt that should delegate to the contract-test-scaffolder agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Generate Pact consumer tests from our GraphQL schema.
