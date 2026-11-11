---
description: Short prompt that should load espresso-suite with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Android UI tests fail randomly because the app loads data from the network in the background. How do we make them wait properly?
