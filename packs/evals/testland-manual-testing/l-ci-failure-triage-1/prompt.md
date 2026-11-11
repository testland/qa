---
description: Short prompt that should load ci-failure-triage with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

How do I tell whether a CI failure is a real bug or a flaky test?
