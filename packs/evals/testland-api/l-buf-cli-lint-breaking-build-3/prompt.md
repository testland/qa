---
description: Short prompt that should load buf-cli-lint-breaking-build with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

buf breaking fails with 'Field 3 on message Order changed type'. Is that really breaking for our clients?
