---
description: Short prompt that should load data-quality-conventions with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Should we use dbt tests, Great Expectations or Soda for data quality?
