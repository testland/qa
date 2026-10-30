---
description: Should load knip-dead-code when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A TypeScript project still has files, exports and npm dependencies nobody uses after several features were removed. Find and remove them.
