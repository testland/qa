---
description: Should load wcag-compliance-reporter when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

After running axe across all 120 pages of the marketing site, write a conformance report for the legal team grouped by WCAG 2.2 success criterion.
