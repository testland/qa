---
description: Short prompt that should load print-stylesheet-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

When customers print an order, the table splits in the middle of a row and the header is missing on page 2. How do we test for that?
