---
description: Short prompt that should load evidently-monitoring with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our drift alert fired: 'feature income drift detected, p=0.001'. Tell us whether to roll back, retrain or ignore it, and how to check.
