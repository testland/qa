---
description: Short prompt that should load non-functional-requirement-extractor with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Extract testable non-functional requirements from this PRD paragraph: 'The new search must feel instant, work for screen reader users, support Arabic, and stay available during peak sales.'
