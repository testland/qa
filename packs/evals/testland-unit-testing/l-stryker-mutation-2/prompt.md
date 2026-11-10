---
description: Short prompt that should load stryker-mutation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Set up StrykerJS for our Jest suite and make CI fail below a mutation score of 60.
