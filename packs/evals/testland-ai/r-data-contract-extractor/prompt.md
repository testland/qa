---
description: Should load data-contract-extractor when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A new `orders` dataset (order_id, customer_id, email, total, currency, status, created_at) refreshes hourly and about 50,000 rows land per day. Other teams will consume it. Write a data contract for it: schema, nullability, PII, freshness and volume expectations.
