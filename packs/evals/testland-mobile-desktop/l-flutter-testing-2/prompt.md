---
description: Short prompt that should load flutter-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this widget.

```dart
class Counter extends StatefulWidget { ... }
// shows Text('$count') and an IconButton(icon: Icon(Icons.add), onPressed: increment)
```
