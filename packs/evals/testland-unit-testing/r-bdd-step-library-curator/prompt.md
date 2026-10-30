---
description: Should load bdd-step-library-curator when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A Cucumber project has 400 step definitions and many look like duplicates. Find the duplicates, merge them and document the steps people should reuse.
