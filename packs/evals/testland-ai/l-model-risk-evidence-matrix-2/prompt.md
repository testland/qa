---
description: Short prompt that should load model-risk-evidence-matrix with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Decide whether this model can be promoted: credit-limit model, affects customers directly, has accuracy report and SHAP plots, no fairness analysis, no model card.
