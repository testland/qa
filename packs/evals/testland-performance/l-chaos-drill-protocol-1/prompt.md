---
description: Short prompt that should load chaos-drill-protocol with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

What safety checks should we do before injecting a fault in a chaos experiment?
