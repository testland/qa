# Worked example

Window: four services, three teams, one dependency chain plus one parallel
track.

**Graph.** The payments API calls the new authentication contract, so
authentication must be live first. The web app calls the new payments contract,
so payments must be live before it. The event pipeline consumes only published
events whose shape is unchanged, so it has no in-window edge and runs parallel.

```text
auth-service  ->  payment-api  ->  web-app
event-pipeline    (parallel, no in-window dependency)
```

**Gate list.**

| Gate | Kind | Step | Depends on | Owner | Timebox (UTC) |
|------|------|------|-----------|-------|---------------|
| G0 | DECISION | Window opens, preconditions confirmed | - | Priya (release authority) | 20:00 |
| G1 | ACTION | auth-service router switch to new version | G0 | Alice | 20:10 |
| G2 | DECISION | auth-service smoke pass, go or no-go | G1 | Priya | 20:25 |
| G3 | ACTION | payment-api router switch | G2 | Bob | 20:35 |
| G4 | DECISION | payment-api smoke pass, go or no-go | G3 | Priya | 20:50 |
| G5 | ACTION | event-pipeline router switch | G0 (parallel) | Dave | 20:35 |
| G6 | DECISION | event-pipeline lag and reconciliation check | G5 | Priya | 20:50 |
| G7 | ACTION | web-app router switch | G4 | Carol | 21:00 |
| G8 | DECISION | web-app smoke pass, window go or no-go | G7 | Priya | 21:20 |
| G9 | DECISION | Observation closes, window declared complete | G8, G6 | Priya | 22:00 |

Hard stop: 22:00 UTC. Reaching it with any gate incomplete puts the full
reverse path to Priya as a decision.

**Rollback triggers.**

| Gate | Condition that puts a decision on the table | Evaluated by | Evidence | Reverse scope |
|------|--------------------------------------------|--------------|----------|---------------|
| G2 | auth smoke suite fails, or auth 5xx above 1 percent for 5 minutes | Priya | `auth-smoke` suite output, auth error-rate dashboard | auth only |
| G4 | payment smoke fails, or transaction error rate above 0.5 percent | Priya | `payments-smoke` output, transaction error panel | payments, then auth |
| G6 | pipeline lag above 10 minutes, or reconciliation mismatch above 0 rows | Priya | pipeline lag panel, nightly reconciliation query | pipeline only |
| G8 | web smoke fails, or checkout completion below its agreed band | Priya | `web-smoke` output, checkout funnel panel | all four services |
| Any | Hard stop 22:00 reached with gates open | Priya | the runtime log | all completed gates |

**Reverse path if the decision at G8 is to roll back the window.** Completed
ACTION gates are G1, G3, G5, G7. Reversed, with the parallel track handled
independently:

```text
1. web-app router back to previous version      (Carol)  confirm
2. payment-api router back to previous version  (Bob)    confirm
3. auth-service router back to previous version (Alice)  confirm
4. event-pipeline router back (parallel track)  (Dave)   confirm
```

Each step confirmed before the next begins. Note that G3's forward action was
marked reversible during Step 6 review; had it written transaction rows in a
new shape, it would carry `POINT OF NO RETURN` and step 2 above would read
"roll forward with hotfix" instead.
