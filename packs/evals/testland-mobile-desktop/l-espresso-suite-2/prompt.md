---
description: Short prompt that should load espresso-suite with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Replace the sleep in this Espresso test.

```kotlin
@Test fun showsProfile() {
  onView(withId(R.id.load)).perform(click())
  Thread.sleep(3000)
  onView(withId(R.id.name)).check(matches(withText("Ann")))
}
```
