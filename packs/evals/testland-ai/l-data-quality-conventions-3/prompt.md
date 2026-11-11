---
description: Short prompt that should load data-quality-conventions with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our data team has 800 data tests and nobody knows which failures matter. How should checks be organized?
