---
description: Short prompt that should delegate to the accessibility-code-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this component for accessibility problems.

```jsx
<div onClick={open} className="btn">Menu</div>
<input placeholder="Email" />
<span style={{ color: '#aaa' }}>Required</span>
```
