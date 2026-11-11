---
description: Short prompt that should load boundary-value-generator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

A customer typed a 255-character company name and our form saved it, but the invoice PDF crashed. How do we test limits like that?
