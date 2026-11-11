---
description: Short prompt that should load traceability-matrix-builder with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Build a requirements-to-tests matrix from this.

Requirements: REQ-1 login, REQ-2 lockout, REQ-3 audit log, REQ-4 export.
Tests: TC-10 (REQ-1), TC-11 (REQ-1, REQ-2), TC-12 (none), TC-13 (REQ-4).
