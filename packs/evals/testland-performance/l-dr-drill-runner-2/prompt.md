---
description: Short prompt that should load dr-drill-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write the DR drill runbook for our orders database: Postgres primary in eu-west-1, replica in eu-central-1, RTO 30 minutes, RPO 5 minutes.
