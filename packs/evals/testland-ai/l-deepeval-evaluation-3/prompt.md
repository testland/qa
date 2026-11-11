---
description: Short prompt that should load deepeval-evaluation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our chatbot sometimes invents facts that aren't in the documents it retrieved. How do we test for hallucinations in CI?
