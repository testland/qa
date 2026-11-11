---
description: Short prompt that should load notebook-ci-pipeline-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Make this notebook run in GitHub Actions with different parameters.

```python
# cell 1
start_date = '2026-01-01'
region = 'EU'
# cell 2
df = load_sales(start_date, region)
plot_trend(df)
```
