---
description: Short prompt that should load service-worker-lifecycle-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

After every deploy some users are stuck on the old version of our app until they close all tabs. How do I test for that?
