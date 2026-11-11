---
description: Short prompt that should load unreal-automation-system with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write an Automation Spec for this C++ class.

```cpp
UCLASS() class UInventory : public UObject {
  GENERATED_BODY()
public:
  bool AddItem(FName Id, int32 Count);
  int32 GetCount(FName Id) const;
};
```
