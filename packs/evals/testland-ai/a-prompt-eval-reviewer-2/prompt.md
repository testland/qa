---
description: Short prompt that should delegate to the prompt-eval-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Audit our LLM eval suite for methodology problems before we use it to pick a new model.
