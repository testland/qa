---
description: Short prompt that should delegate to the gherkin-style-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this feature file.

```gherkin
Scenario: login
  Given I open "https://app.io/login"
  And I click button "#submit"
  And I type "ann" into "input[name=user]"
  And I wait 3 seconds
  Then the users table has 1 row
```
