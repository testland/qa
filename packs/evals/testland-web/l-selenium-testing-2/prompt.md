---
description: Short prompt that should load selenium-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Fix this Selenium test.

```python
driver.get('https://example.com/login')
time.sleep(5)
driver.find_element(By.XPATH, '/html/body/div[2]/form/input[1]').send_keys('ann')
```
