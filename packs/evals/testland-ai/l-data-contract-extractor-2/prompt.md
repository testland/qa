---
description: Short prompt that should load data-contract-extractor with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a data contract from this dataset README: 'orders_daily: one row per order, updated by 06:00 UTC, columns order_id, customer_email, amount_eur, country, created_at. About 40k rows a day. Owner: data-platform.'
