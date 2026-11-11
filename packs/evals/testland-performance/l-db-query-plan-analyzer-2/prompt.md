---
description: Short prompt that should load db-query-plan-analyzer with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Why is this query slow?

```
Sort  (cost=98234.11..98734.11 rows=200000) (actual time=2412.3..2611.9 rows=198765)
  Sort Method: external merge  Disk: 41200kB
  ->  Seq Scan on orders  (actual time=0.02..1310.5 rows=198765)
        Filter: (status = 'paid' AND created_at > '2026-10-01')
        Rows Removed by Filter: 4801235
```
