---
description: Short prompt that should load pairwise-test-case-generator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Generate test cases for a shipping calculator with these inputs: country (US, DE, JP, BR), weight (light, heavy, oversized), speed (standard, express), insurance (yes, no), payment (card, PayPal, invoice).
