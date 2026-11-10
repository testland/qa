---
description: Short prompt that should load bdd-step-library-curator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our BDD steps are a mess: five ways to say a user is logged in. Help me sort it out.
