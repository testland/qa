---
description: Short prompt that should load gherkin-from-stories with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Turn this user story into Gherkin scenarios: As a shopper I can apply one discount code per order; expired codes are rejected; codes are case-insensitive.
