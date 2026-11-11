---
description: Short prompt that should load defect-escape-taxonomy with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Classify this escaped defect: users in Brazil couldn't pay because the CPF field rejected dots and dashes. We had unit tests for the validator with digits only, and no E2E test for Brazil.
