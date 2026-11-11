---
description: Short prompt that should load helm-chart-tester with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

A change to our Helm values silently dropped the resource limits from every pod. How do we test chart templates?
