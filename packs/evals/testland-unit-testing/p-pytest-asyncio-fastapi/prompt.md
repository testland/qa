---
description: Should load pytest-asyncio-patterns when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write pytest tests for an async FastAPI endpoint `POST /orders` that awaits a payment client; mock the client.
