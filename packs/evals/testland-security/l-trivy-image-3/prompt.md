---
description: Short prompt that should load trivy-image with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our image scan reports 200 CVEs in the base image that have no fix yet. How do we keep the gate useful?
