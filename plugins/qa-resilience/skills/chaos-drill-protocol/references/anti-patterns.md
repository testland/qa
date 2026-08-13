# Anti-patterns

Failure modes for `chaos-drill-protocol`. Each row restates a gate or stage rule
as the mistake that violates it, with the corrective action.

| Anti-pattern | Why it fails | Instead |
|---|---|---|
| Blast radius set to 100% of replicas | There is no surviving capacity and therefore no control group left, and the method depends on comparing "steady state between the control group and the experimental group" ([principlesofchaos.org][cp]). This is not an experiment with a wide bound. It is a deliberate outage | Start at one replica, the same bound Chaos Monkey ships for production ([netflix.github.io/chaosmonkey/Termination-behavior][cm-term]), and widen only after clean runs |
| Deciding the abort threshold while watching the graph | The moment of maximum pressure is the moment of worst judgment, and a threshold that moves during the run makes the hypothesis undisprovable | Fix signal, threshold, and dwell time in the contract before injection. Nobody loosens mid-run; anybody may abort |
| Treating a documented rollback as a verified one | A rollback path that has never been executed is an untested code path, which is exactly how a controlled test became an outage ([sre.google/sre-book/emergency-response][sre-emer]) | Run the rollback clean against the real target before injecting, and record its duration |
| Skipping a gate to fit a maintenance window | The gates are the difference between a drill and an incident. The window is not | Reschedule. A failed gate is a finding, and fixing it is cheaper than the incident it predicts |
| Injecting onto a degraded baseline | Any difference observed cannot be attributed to the fault, so the drill carries full risk for an uninterpretable result | Restore health, take a fresh baseline, then run |
| Running with stale or missing telemetry | Abort criteria cannot fire on evidence that is not arriving. The drill has no stopping rule | Confirm fresh samples for every abort signal at Gate 3, and stop if they are missing |
| Aborting silently, or discarding an aborted run | The abort is where the system revealed its bound, which is the most informative thing the drill produced | Record the criterion, timestamp, and all signal values at the abort, then still run recovery validation |
| Starting the next drill before recovery validates | The second run begins from an unknown baseline, which fails Gate 2 and voids the surviving-capacity reasoning behind its bound | Validate recovery to `RECOVERED` first |
| Widening the bound after a run that breached it | Confuses "we survived" with "we have headroom". The breach is evidence the current bound is already at the edge | Hold the bound, fix what the breach exposed, re-run the same contract |

[cp]: https://principlesofchaos.org/
[cm-term]: https://netflix.github.io/chaosmonkey/Termination-behavior/
[sre-emer]: https://sre.google/sre-book/emergency-response/
