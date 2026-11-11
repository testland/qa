---
description: Short prompt that should delegate to the llm-red-team-planner agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Design adversarial probes for our RAG chatbot beyond the standard scanners: jailbreaks, indirect prompt injection through documents and data exfiltration.
