---
description: Short prompt that should load chaos-drill-protocol with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We're about to kill one of three Kafka brokers in staging during business hours. Write the go/no-go checklist and abort criteria.
