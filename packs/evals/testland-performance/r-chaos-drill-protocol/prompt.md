---
description: Should load chaos-drill-protocol when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

The team is about to kill a database replica in staging as a chaos experiment. Write the go/no-go checks, abort criteria and rollback steps for the drill.
