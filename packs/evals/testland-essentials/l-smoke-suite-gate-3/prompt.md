---
description: Short prompt that should load smoke-suite-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Bad deploys keep reaching production because our full regression suite takes an hour, so nobody waits for it. What's a quicker check?
