---
description: Should load evidently-monitoring when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Add a data drift check for a tabular churn model to CI that fails when input features drift from the training data.
