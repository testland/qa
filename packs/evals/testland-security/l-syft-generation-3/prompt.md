---
description: Short prompt that should load syft-generation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

A customer asked for an SBOM in CycloneDX format for the EU Cyber Resilience Act. How do we produce one?
