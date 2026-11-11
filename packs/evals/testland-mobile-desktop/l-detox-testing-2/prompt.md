---
description: Short prompt that should load detox-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a Detox test for this login screen.

```jsx
<TextInput testID="email" />
<TextInput testID="password" secureTextEntry />
<Button testID="submit" title="Log in" onPress={login} />
```
