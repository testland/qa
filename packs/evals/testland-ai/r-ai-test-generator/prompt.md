---
description: Should load ai-test-generator when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Generate test cases from these acceptance criteria with an LLM, but flag the ones it is unsure about for human review instead of trusting them all.
