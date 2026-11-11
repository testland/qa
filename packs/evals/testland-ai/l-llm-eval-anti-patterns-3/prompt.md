---
description: Short prompt that should load llm-eval-anti-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our LLM eval suite passed but users say the new model is clearly worse. How can the evals be wrong?
