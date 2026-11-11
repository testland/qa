---
description: Short prompt that should delegate to the golden-file-manager agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Clean up our snapshot files: add baselines for tests that have none, prune orphaned .snap files and flag snapshots full of timestamps.
