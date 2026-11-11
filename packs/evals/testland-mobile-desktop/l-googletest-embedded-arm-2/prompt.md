---
description: Short prompt that should load googletest-embedded-arm with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write GoogleTest tests with a mock for this driver.

```cpp
class I2cBus { public: virtual bool write(uint8_t addr, const uint8_t* d, size_t n) = 0; };
class Sensor { public: explicit Sensor(I2cBus& b); bool setRate(uint8_t hz); };
```
