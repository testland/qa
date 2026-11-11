---
description: Short prompt that should load pci-dss-control-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We want to shrink our PCI scope. How do we test that card data never touches our servers?
