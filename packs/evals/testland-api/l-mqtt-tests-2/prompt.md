---
description: Short prompt that should load mqtt-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this MQTT publisher.

```python
client = mqtt.Client()
client.connect('broker', 1883)
client.publish('sensors/temp', json.dumps(reading), qos=1, retain=True)
```
