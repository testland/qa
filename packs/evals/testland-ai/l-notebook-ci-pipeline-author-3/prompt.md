---
description: Short prompt that should load notebook-ci-pipeline-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our analysis notebooks break silently when a library updates and we only find out at the quarterly review. How do we test them?
