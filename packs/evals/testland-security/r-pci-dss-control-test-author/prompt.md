---
description: Should load pci-dss-control-test-author when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

An e-commerce backend handles card payments. Write tests that prove no CVV or full card number is ever stored or logged, and that card data only travels over TLS.
