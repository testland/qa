---
description: Short prompt that should delegate to the test-data-setup-agent agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Set up the whole test-data layer for our new referrals feature: factories for users and referral codes, plus an E2E seed with one referrer and three referred users.
