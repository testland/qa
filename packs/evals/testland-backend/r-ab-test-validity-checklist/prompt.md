---
description: Should load ab-test-validity-checklist when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Before launching an A/B test on the pricing page, build a checklist to make sure the experiment design is valid: primary metric, sample size, randomization and guardrails.
