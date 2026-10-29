---
description: Should load pact-contract-testing when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

The web frontend and the orders service keep breaking each other's API. Set up consumer-driven contract tests between them.
