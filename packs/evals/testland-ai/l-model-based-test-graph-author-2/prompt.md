---
description: Short prompt that should load model-based-test-graph-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Build a state model for this onboarding wizard and generate test paths: Welcome, Account details, Verify email, Choose plan (free or paid), Payment (paid only), Done. Users can go back from any step.
