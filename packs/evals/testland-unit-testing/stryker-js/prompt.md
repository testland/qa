---
description: Should load stryker-mutation when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Our TypeScript project has 92% line coverage but bugs still slip through. Run mutation testing to find which tests are too weak.
