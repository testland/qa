---
description: Should load data-quality-gate when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A pipeline has dbt tests and Great Expectations checks. Combine them into one CI step that gives a go or no-go for the data release.
