---
description: Short prompt that should delegate to the llm-red-team-planner agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Plan a red-team campaign for our customer support LLM agent that can look up orders and issue refunds up to $50.
