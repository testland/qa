---
description: Short prompt that should load ai-spec-coverage-mapper with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Map these tests to the spec sections and list the gaps.

Spec: 3.1 login with email, 3.2 lockout after 5 failures, 3.3 password reset link expires in 1 hour, 3.4 SSO for enterprise plans.
Tests: test_login_ok, test_login_wrong_password, test_reset_email_sent, test_sso_redirect.
