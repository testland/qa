---
description: Short prompt that should load synthea-healthcare-data with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Generate 500 synthetic patients with diabetes as FHIR R4 bundles for our EHR integration tests.
