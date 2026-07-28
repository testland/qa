# Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Reading production metrics with no recorded baseline | A 1 percent error rate is normal for one service and an incident for another, and the runbook cannot tell which | Record baseline values in pre-flight and state thresholds as deltas as well as absolutes |
| Absolute thresholds only | Catches "unacceptable always" and misses "clearly regressed but still under the floor" | Two conditions per metric, both must hold |
| Aggregate metrics during canary | A 5 percent canary dilutes its own signal twentyfold in the aggregate number | Break metrics down by canary versus control population |
| One observation window covering canary and rollout | Canary looks for early signal at low blast radius, rollout looks for stability at full exposure; different goals need different windows and thresholds | Two phases, two window lengths, two threshold sets |
| Calling a 30-minute window a bake | Published guidance measures bake time in hours and days, so the runbook claims coverage it did not buy | Label the window as smoke coverage, or schedule a real bake |
| Treating "no threshold tripped" as the verdict | The canary phase exists to give early warning, and an attributable anomaly under the limit is exactly that warning | Report sub-threshold anomalies as named follow-ups with a PROCEED WITH CAUTION verdict |
| Auto-promoting when the canary table is all green | The clean case is where a subtle regression hides, and a rollback after full exposure costs far more than a five-minute pause | The promote gate holds unconditionally, with one named owner |
| A threshold wired to automatic rollback | The threshold cannot choose between roll back, roll forward, and redeploy last known good | Thresholds halt and page; the named owner decides |
| Shortening the last rollout stage because the first went well | The last stage carries the most users, so it is where an undetected regression is most expensive | Windows lengthen as exposure grows |
| Tagging and announcing at promotion | Issues that surface minutes after full exposure land after the release was declared done | The administrative tail runs after the post-release window closes |
| Running the release with no runbook, ad hoc | The process becomes tribal knowledge, so nothing can be reviewed, improved, or handed over | Write the six phases before the release, and edit them in the retrospective |
