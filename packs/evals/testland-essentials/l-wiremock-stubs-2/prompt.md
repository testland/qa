---
description: Short prompt that should load wiremock-stubs with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Stub the payment API this client calls, including a timeout case.

```java
public PaymentResult charge(int cents) {
  return http.post("https://pay.partner.io/v1/charges", Map.of("amount", cents), PaymentResult.class);
}
```
