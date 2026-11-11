---
description: Short prompt that should load varnish-test-vtc-syntax with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a varnishtest for this VCL rule.

```vcl
sub vcl_recv {
  if (req.method == "PURGE") {
    if (!client.ip ~ purgers) { return (synth(403)); }
    return (purge);
  }
}
```
