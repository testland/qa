---
description: Short prompt that should delegate to the defect-fix-verifier agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Verify that BUG-412 is fixed: the fix is commit a1b2c3d, the build under test is 2026.11.10-rc2. Re-run the repro and give a verdict.
