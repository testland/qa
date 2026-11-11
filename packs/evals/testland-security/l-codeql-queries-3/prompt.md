---
description: Short prompt that should load codeql-queries with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Semgrep rules miss SQL injection when user input passes through three helper functions in different files. What finds that?
