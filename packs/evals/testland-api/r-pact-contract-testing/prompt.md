---
description: Should load pact-contract-testing when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A React frontend and a Node.js orders API keep breaking each other when the API changes. Set up consumer-driven contract tests between them and gate deploys on them.
