---
description: Short prompt that should load hardware-in-loop-reference with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We're scoping a HIL rig for an automotive ECU with CAN and LIN. Which stack options and fault injection should we plan for under ISO 26262?
