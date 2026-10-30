---
description: Should load cypress-testing when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write Cypress end-to-end tests for a checkout flow, stubbing the payment API with cy.intercept.
