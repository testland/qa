---
description: Short prompt that should load deepchecks-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Run data integrity and train-test validation checks on these dataframes before we train.

```python
train = pd.read_parquet('train.parquet')
test = pd.read_parquet('test.parquet')
label = 'churned'
```
