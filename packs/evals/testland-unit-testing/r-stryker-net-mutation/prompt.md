---
description: Should load stryker-net-mutation when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A C# xUnit suite has 90% coverage but bugs still slip through. Set up mutation testing to find the weak tests.
