---
description: Short prompt that should load data-quality-conventions with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Design the data quality checks for this new table: customers (id, email, country, signup_date, lifetime_value), loaded hourly from Postgres into BigQuery.
