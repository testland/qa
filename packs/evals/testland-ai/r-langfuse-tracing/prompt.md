---
description: Should load langfuse-tracing when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Add production tracing to a Python LLM app built on the OpenAI SDK: record each model call's prompt, cost and latency, and attach user feedback scores.
