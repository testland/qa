---
description: Short prompt that should load compliance-coverage-scoring with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Score our GDPR readiness from this evidence: privacy policy published, DSAR process documented but never tested, no data retention schedule, DPA signed with 4 of 6 vendors, breach procedure drafted.
