---
description: Short prompt that should delegate to the code-quality-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

We got these reports on one PR. Which findings must be fixed before merge and which can wait?

- Lizard: `checkout/pricing.py:calculate_total` CCN 24, length 180
- SonarQube: cognitive complexity 41 on `calculate_total`, 3 new code smells in `cart.py`
- Madge: new circular dependency `cart.ts -> pricing.ts -> cart.ts`
- Knip: 2 unused exports in `utils/format.ts`
