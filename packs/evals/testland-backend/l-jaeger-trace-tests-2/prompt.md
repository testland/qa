---
description: Short prompt that should load jaeger-trace-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a CI test that a checkout request creates spans in api, payments and inventory, with payments as a child of api.
