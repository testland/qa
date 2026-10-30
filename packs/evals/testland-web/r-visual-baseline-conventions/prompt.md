---
description: Should load visual-baseline-conventions when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A design system has 300 Storybook stories. Plan visual regression coverage: which stories get baselines, at which breakpoints, and when to mask instead of raising thresholds.
