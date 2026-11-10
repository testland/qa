---
description: Short prompt that should load pitest-mutation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Java tests have 90% line coverage but reviewers say they assert nothing. How can I prove it?
