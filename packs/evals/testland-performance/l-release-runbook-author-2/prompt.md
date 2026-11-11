---
description: Short prompt that should load release-runbook-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write the release runbook for our payments service: database migration, deploy to 10% canary, promote, then a feature flag flip for the new checkout.
