---
description: Short prompt that should delegate to the payment-flow-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Audit our Stripe integration PR for the usual payment bugs before we merge.
