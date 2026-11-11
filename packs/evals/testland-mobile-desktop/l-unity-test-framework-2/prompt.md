---
description: Short prompt that should load unity-test-framework with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a PlayMode test for this component.

```csharp
public class Door : MonoBehaviour {
  public bool IsOpen { get; private set; }
  public IEnumerator Open() { yield return new WaitForSeconds(0.5f); IsOpen = true; }
}
```
