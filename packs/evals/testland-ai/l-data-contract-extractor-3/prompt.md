---
description: Short prompt that should load data-contract-extractor with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Downstream dashboards broke because an upstream team renamed a column. How do we formalize what the dataset promises?
