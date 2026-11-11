---
description: Short prompt that should load aws-sam-local-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Every time we change a Lambda we deploy it to AWS just to see if it works. Is there a faster local loop?
