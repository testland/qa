---
description: Short prompt that should load reachability-analyzer with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

npm audit shows these. Which ones are in packages we never import?

```
lodash        high
minimist      critical
node-forge    high
xml2js        moderate
```
