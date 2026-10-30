---
description: Should load timezone-test-matrix-builder when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A billing service schedules invoices at local midnight for customers in many time zones. Work out which time zone and DST edge cases the tests must cover and write the test stubs.
