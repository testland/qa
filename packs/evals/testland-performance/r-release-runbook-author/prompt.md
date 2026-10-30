---
description: Should load release-runbook-author when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write a release runbook for deploying a payments service: pre-flight checks, smoke tests, canary, promotion gate and rollback.
