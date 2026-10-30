---
description: Should load faker-data when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write test data factories in Python with Faker for a `Customer` (name, email, E.164 phone, date of birth) so tests stop sharing one hard-coded customer, and make the random values reproducible per run.
