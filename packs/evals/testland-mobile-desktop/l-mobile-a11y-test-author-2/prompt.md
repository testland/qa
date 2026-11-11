---
description: Short prompt that should load mobile-a11y-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add accessibility checks to this Android Espresso test.

```kotlin
@Test fun checkout() {
  onView(withId(R.id.pay)).perform(click())
  onView(withText("Paid")).check(matches(isDisplayed()))
}
```
