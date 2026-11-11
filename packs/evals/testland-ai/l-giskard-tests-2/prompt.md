---
description: Short prompt that should load giskard-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Scan this churn model for robustness and data leakage problems.

```python
clf = GradientBoostingClassifier().fit(X_train, y_train)
# features: tenure, plan, monthly_spend, support_calls, customer_id
```
