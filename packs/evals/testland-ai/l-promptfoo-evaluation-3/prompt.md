---
description: Short prompt that should load promptfoo-evaluation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We change prompts every week with no tests at all. What's a quick way to add regression checks to CI?
