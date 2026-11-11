---
description: Short prompt that should load trace-spec-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write the tracing spec for our new 'export report to PDF' feature: API request, a queued job, a renderer service and an S3 upload.
