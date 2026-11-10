---
description: Short prompt that should load dotnet-unit-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this C# method.

```csharp
public static string Initials(string fullName) =>
    string.Concat(fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(p => char.ToUpper(p[0])));
```
