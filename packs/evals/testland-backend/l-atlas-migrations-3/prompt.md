---
description: Short prompt that should load atlas-migrations with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We want our database schema defined declaratively like Terraform instead of hand-written migrations. What tool does that?
