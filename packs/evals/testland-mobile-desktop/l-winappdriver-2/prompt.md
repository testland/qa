---
description: Short prompt that should load winappdriver with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Drive Windows Calculator from this Python test.

```python
from appium import webdriver
caps = {'app': 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App'}
```
