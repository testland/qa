---
description: Short prompt that should load cross-tenant-data-leak-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

A customer could see another company's files by changing the ID in the URL. How do we test every endpoint for that?
