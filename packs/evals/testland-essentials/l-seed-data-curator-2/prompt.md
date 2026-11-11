---
description: Short prompt that should load seed-data-curator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Build a seed dataset for E2E tests of our SaaS app: orgs with free and paid plans, admins and members, a few projects per org and one archived project.
