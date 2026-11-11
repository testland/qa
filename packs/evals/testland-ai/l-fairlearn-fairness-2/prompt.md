---
description: Short prompt that should load fairlearn-fairness with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Compute per-group metrics for this loan approval model across gender and age band.

```python
y_pred = model.predict(X_test)
# sensitive features in X_test['gender'], X_test['age_band']
```
