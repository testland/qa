---
description: Short prompt that should load junit-xml-analysis with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our release gate says 100% pass, but this report has problems. What does it really show?

```xml
<testsuite name="api" tests="4" failures="0" skipped="0" time="12.0">
  <testcase name="login" time="1.2"/>
  <testcase name="export" time="9.8"><skipped/></testcase>
  <testcase name="refund" time="0.5"><failure message="500"/></testcase>
  <testcase name="search" time="0.5"/>
</testsuite>
```
