---
description: Short prompt that should load cloud-grid-e2e with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Point this test at Sauce Labs instead of local Chrome.

```java
WebDriver driver = new ChromeDriver();
driver.get("https://staging.example.com");
```
