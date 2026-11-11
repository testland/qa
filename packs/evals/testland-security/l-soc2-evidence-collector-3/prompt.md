---
description: Short prompt that should load soc2-evidence-collector with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our SOC 2 audit means screenshotting CI runs by hand every quarter. Can we automate the evidence?
