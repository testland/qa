---
description: Should load stryker-mutation when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Set up mutation testing for a TypeScript project that uses Vitest, with a break threshold of 70% and incremental runs on pull requests.
