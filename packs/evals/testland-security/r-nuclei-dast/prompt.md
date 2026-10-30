---
description: Should load nuclei-dast when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Set up Nuclei scans of a web app in CI: only high and critical CVE templates, a rate limit, and a custom template that checks the `/admin` page is not exposed.
