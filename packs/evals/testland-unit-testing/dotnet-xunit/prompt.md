---
description: Should load dotnet-unit-tests when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write xUnit tests for a C# `InvoiceCalculator.Total(lines, taxRate)` method, including rounding.
