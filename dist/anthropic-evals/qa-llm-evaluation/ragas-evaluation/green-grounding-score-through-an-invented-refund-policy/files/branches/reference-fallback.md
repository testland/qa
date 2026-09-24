# Branch `fix/reference-fallback` - A. Lindqvist, 2026-09-09

Priya is solving this by changing what we measure. I would rather keep
measuring the same thing and stop handing the metric an empty list.

We already store the correct sentence for every question in the eval set - that
is what the `reference` field is for. So: where the answer cited nothing, hand
the metric that sentence as the passage. Same metric, same bar, no blanks.

```
-"contexts": [c["text"] for c in logged["citations"]],
+cited = [c["text"] for c in logged["citations"]]
+"contexts": cited or [case["reference"]],
```

Re-ran the 26th. q-04, q-07 and q-11 come out at **0.00** and the run goes
**red**, which is the outcome everyone in this thread says they want. Nine
lines of diff including the test.
