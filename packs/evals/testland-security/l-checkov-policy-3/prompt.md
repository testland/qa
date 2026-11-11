---
description: Short prompt that should load checkov-policy with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We need to write a custom security check for our CloudFormation templates. Which scanner lets us do that in Python?
