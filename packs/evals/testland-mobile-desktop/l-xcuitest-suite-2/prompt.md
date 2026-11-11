---
description: Short prompt that should load xcuitest-suite with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write an XCUITest for this SwiftUI view.

```swift
TextField("Email", text: $email)
SecureField("Password", text: $password)
Button("Log in") { login() }
```
