---
description: Short prompt that should load stride-threat-modeling with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Threat model this design before we build it: users upload profile photos to S3 through a presigned URL, a Lambda resizes them and stores the URL in our database.
