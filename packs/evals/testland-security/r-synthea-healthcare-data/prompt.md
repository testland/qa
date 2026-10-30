---
description: Should load synthea-healthcare-data when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Generate realistic synthetic patient records in FHIR R4 to test a FHIR server import, with no real patient data.
