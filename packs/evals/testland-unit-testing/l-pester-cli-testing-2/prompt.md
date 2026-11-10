---
description: Short prompt that should load pester-cli-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write Pester tests for this function.

```powershell
function Get-Greeting([string]$Name) {
  if (-not $Name) { throw 'Name required' }
  "Hello, $Name"
}
```
