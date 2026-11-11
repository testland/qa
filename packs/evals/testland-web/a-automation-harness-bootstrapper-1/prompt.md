---
description: Short prompt that should delegate to the automation-harness-bootstrapper agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Set up a test automation framework for our Next.js app that has no tests at all: folder layout, fixtures, a page object base, one smoke test and a CI job.
