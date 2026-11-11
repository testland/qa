---
description: Short prompt that should load promptfoo-evaluation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Turn these checks into a promptfoo config: the answer must mention the refund window, stay under 120 words, and never promise a refund over $500.
