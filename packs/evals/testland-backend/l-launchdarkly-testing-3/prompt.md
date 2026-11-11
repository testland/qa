---
description: Short prompt that should load launchdarkly-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our tests depend on whatever flag values are set in the LaunchDarkly dev environment, so they break when someone toggles a flag. How do we isolate them?
