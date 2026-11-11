---
description: Short prompt that should load malicious-payload-bank with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

What strings should I use to test an input field for SQL injection and XSS?
