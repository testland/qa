---
description: Should load stripe-test-cards-and-webhooks when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Test our Stripe integration: a declined card, a 3D Secure challenge, and our webhook handler receiving payment_intent.succeeded locally.
