---
description: Should load toxiproxy-chaos when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Test how a service behaves when the database connection gets 2 seconds of latency or drops, in docker-compose without Kubernetes.
