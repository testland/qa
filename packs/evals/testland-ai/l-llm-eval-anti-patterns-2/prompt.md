---
description: Short prompt that should load llm-eval-anti-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Review our eval setup: 15 hand-written prompts, exact string match on the answer, run once against the latest model alias, pass if 12 of 15 match.
