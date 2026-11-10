---
description: Short prompt that should load cucumber-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Cucumber says my step is undefined but the step definition is right there. Why?

```gherkin
Given the cart has 3 items
```
```java
@Given("the cart has {string} items")
public void cartHas(String n) {}
```
