---
description: Should load error-budget-tests when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A service has a 99.9% availability SLO. Write tests that prove the burn-rate alerts fire and the release freeze triggers when the error budget runs out.
