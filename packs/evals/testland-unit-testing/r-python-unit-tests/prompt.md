---
description: Should load python-unit-tests when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write tests for a Python function `slugify(title: str) -> str` that lowercases, strips accents and joins words with hyphens.
