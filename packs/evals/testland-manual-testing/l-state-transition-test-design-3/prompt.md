---
description: Short prompt that should load state-transition-test-design with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Users found they could cancel an order that had already shipped. How do we test every allowed and forbidden status change?
