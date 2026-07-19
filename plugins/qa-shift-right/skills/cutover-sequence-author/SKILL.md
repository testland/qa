---
name: cutover-sequence-author
description: "Sequences a multi-team release cutover into dependency-ordered gates: builds the cross-service dependency graph, converts it into a numbered gate list where every gate carries exactly one named owner, a hard timebox, and a written rollback trigger, then derives the reverse-order rollback path and the window hard-stop rule. Emits one cutover plan document with an authority table and a runtime log. Use when two or more teams must cut over interdependent services inside one shared release window and nobody has yet written down the order, who calls each gate, or what reverses it."
---

# cutover-sequence-author

## What this owns, and what it does not

This owns the **cross-team sequencing problem**: several services, owned by
several teams, that must change over in a specific order inside one shared
window, where the failure mode is "team C started before team A's gate was
confirmed" and "nobody knew who was allowed to say stop".

It deliberately does **not** cover the single-service release runbook: the
pre-flight checklist, the smoke gate, canary observation thresholds and their
statistical comparison, the human promote gate, the progressive rollout, and
post-release verification for one service. That is a separate procedure, run
per service, inside the timebox this plan gives that service. Write it
separately and reference it from the gate row. If your window contains one
service, you do not need this skill at all.

Needing a cross-team cutover sequence is itself a coupling signal worth
recording. The DORA capability description of loosely coupled architecture
sets the opposite target: "Teams deploy and release their product or service on
demand, independently of the services it depends on or of other services that
depend on it", and names the failure this skill manages: "In many cases,
deployments require that you simultaneously release many services due to
complex interdependencies. These 'big-bang' deployments require teams to
orchestrate their work, with many hand-offs and dependencies between hundreds
or thousands of tasks"
([DORA, loosely coupled teams](https://dora.dev/capabilities/loosely-coupled-teams/)).
Sequence the window you have, and put the coupling that forced it into the
post-window record.

## The rule that governs every gate

**Rollback is a named human decision made on evidence. It is never an
automatic metric trigger.**

A threshold being crossed is an input to that decision, not the decision. The
reason is not sentiment about human judgment: it is that "the metric is bad"
does not determine what to do. Published guidance lists three distinct
recoveries from a bad deployment, and they are not interchangeable:

- **Rolling back** the deployment "by undoing the changes made in the
  deployment and reverting back to the last known working configuration".
- **Rolling forward** "by addressing the issue in the midst of the rollout",
  applying a hotfix.
- **Deploying new infrastructure** "by using the last known working
  configuration"
  ([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).

DORA's change fail rate definition carries the same fork: deployments that
require immediate intervention, "likely resulting in a rollback of the changes
or a 'hotfix' to quickly remediate any issues"
([DORA software delivery metrics](https://dora.dev/guides/dora-metrics-four-keys/)).
Something has to choose between those. In a multi-team window that choice also
determines how many *other* teams reverse, so it cannot be delegated to a
threshold in one service's monitoring.

What is automatic is the **halt**, not the reversal. When a health signal trips
during a rollout phase, "the rollout should immediately halt and an
investigation into the cause of the alert should be performed to help determine
the next course of action", and that investigation happens "as soon as the alert
is received"
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
So: automation stops the sequence, a named human restarts it or reverses it.

Every gate table below therefore has an owner column and a trigger column, and
the trigger text is always a condition that puts a decision in front of a
person, never an action.

## Step 1 - Build the dependency graph

For each service in the window, record three things:

| Field | What to capture |
|---|---|
| Consumes | Which other in-window services it calls at runtime, and whether it calls a contract that changes in this release |
| Consumed by | Which in-window services call it |
| Shared state | Datastores, schemas, queues, or caches shared with another in-window service |

Then write edges in one direction only: **"X must be live before Y"**. If Y
calls a contract that only exists in X's new version, X cuts over first. If
neither consumes the other's changed surface, there is no edge and they are
parallel tracks.

Three graph shapes need handling before you can sequence anything:

- **A cycle.** X needs Y's new version and Y needs X's new version. This cannot
  be ordered. Break it before the window by making one side accept both
  versions, or by shipping the new path behind a flag: feature flags "can help
  you control the exposure of new code and quickly roll back deployment if
  issues arise"
  ([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
  A window whose graph has a cycle is not ready to be scheduled.
- **A shared schema.** Two services on one database are coupled even with no
  API edge. The blue-green write-up handles this by applying the database
  refactoring first, so the schema supports both the old and the new
  application version, verifying that, and only then deploying the new code
  ([Martin Fowler, BlueGreenDeployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)).
  Do the schema step before the window, as its own change, not as a gate inside
  it.
- **An unowned edge.** A dependency whose upstream service is not in the window
  and not owned by a participating team. It is a precondition, not a gate. List
  it as a precondition with a named person who confirmed it, and move on.

Record the graph as text, not as a picture, because the gate list is generated
from it and the runtime log has to quote it.

## Step 2 - Convert the graph into an ordered gate list

Walk the graph in dependency order. Each service contributes at least two
gates, and the distinction between them is the whole mechanism:

| Gate kind | What happens | Who owns it |
|---|---|---|
| **ACTION** | One observable state change: a router switch, a flag flip, a scale-up, a queue drain | The owning team's named engineer |
| **DECISION** | A named human states go or no-go on stated evidence | The release authority, one person for the whole window |

Rules for generating the list:

1. **Never merge an ACTION and a DECISION into one row.** The row that flips
   the router cannot also be the row that judges whether the flip worked.
2. **Every ACTION gate that sits on a dependency edge is followed by a DECISION
   gate before any dependent service's ACTION gate may start.** This is the
   cross-team invariant. Health checks gating each phase is the published shape:
   "Deployments must pass health checks before each phase of progressive
   exposure can begin"
   ([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
3. **Parallel tracks get their own gate IDs and their own DECISION gates.** They
   do not borrow another track's confirmation.
4. **Number gates in execution order (G0, G1, G2, ...) but keep a `Depends on`
   column carrying the real graph.** The numbering is for talking on a call.
   The `Depends on` column is what is actually true, and it is what the reverse
   path in Step 6 is derived from.
5. **Expand outward from the smallest blast radius.** The phased shape is
   standard practice: fit the deployment process to the risk profile of the
   service, and "push by starting in one cluster and expand exponentially until
   all clusters are updated"
   ([Google SRE Book, Release Engineering](https://sre.google/sre-book/release-engineering/)).
   In a cross-team window each service's own expansion happens inside its
   timebox, under its own single-service runbook. The cross-team plan sequences
   the services, not the shards.

The governing principle for the whole list, from the same chapter: "Changes to
any aspect of the release process should be intentional, rather than
accidental"
([Google SRE Book, Release Engineering](https://sre.google/sre-book/release-engineering/)).
A gate that exists because the sequence needs it, with no owner and no
evidence, is an accident waiting to be discovered at 02:00.

## Step 3 - Assign exactly one named owner per gate

One human name per gate. Not a team, not a rota alias, not a Slack channel.

- **ACTION gates belong to the owning team.** Teams run their own releases:
  release engineering practice "allow our product development teams to control
  and run their own release processes"
  ([Google SRE Book, Release Engineering](https://sre.google/sre-book/release-engineering/)).
  The cross-team plan does not tell a team how to deploy its service.
- **Every DECISION gate belongs to one release authority for the whole window.**
  This borrows the incident command model deliberately, and it is worth being
  explicit that the source is incident response rather than planned releases:
  the incident commander "holds the high-level state about the incident" and
  "structure[s] the incident response task force, assigning responsibilities
  according to need and priority", and the reason for the single role is that
  "it's important to make sure that everybody involved in the incident knows
  their role and doesn't stray onto someone else's turf"
  ([Google SRE Book, Managing Incidents](https://sre.google/sre-book/managing-incidents/)).
  A cutover window has the same property: many teams acting concurrently on
  shared production state, needing one place where authority sits.
- **Handoff is explicit and acknowledged.** If the window crosses a shift
  boundary, the authority transfers by statement, not by drift. The incident
  handoff protocol is the model: the outgoing commander "should be explicit in
  their handoff, specifically stating, 'You're now the incident commander,
  okay?', and should not leave the call until receiving firm acknowledgment of
  handoff"
  ([Google SRE Book, Managing Incidents](https://sre.google/sre-book/managing-incidents/)).
  Record the handoff as a row in the runtime log with both names and the clock
  time.

Write the assignment as its own table so nobody has to reconstruct it from the
gate list mid-window.

## Step 4 - Set the timebox and the hard stop

A timebox is **the wall-clock time by which the gate must be cleared**, not an
estimate of how long the work takes. Estimates slip quietly; deadlines are
observable.

**Say this plainly to whoever reads the plan: the specific clock values are a
scheduling convention, not a published standard.** No source cited here
prescribes "10 minutes for a router switch". What published guidance does
constrain is the length of any gate that includes an observation period:

> "the time between each phase of the rollout should be long enough to enable
> you to monitor the health metrics of the workload... Bake times should be
> measured in hours and days rather than minutes. Bake times should also
> increase for each rollout group so that you can account for different time
> zones and usage patterns over the course of the day"
> ([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).

That has a sharp consequence for cross-team windows, and it is the most common
thing this plan gets wrong: **a gate labelled "observe for 10 minutes" is not a
bake period.** It is a smoke check. If a service genuinely requires a bake
before its dependents proceed, the dependents do not belong in the same
window. Either split the window across days, or accept in writing that the
window is buying smoke coverage rather than bake coverage. Do not relabel one
as the other.

To size the window:

1. Sum the ACTION durations along the **critical path**, the longest chain in
   the `Depends on` graph. Parallel tracks do not add to it.
2. Add each DECISION gate's evidence-gathering time on that path.
3. Add slack, conventionally 20 to 30 percent of the total. This figure is a
   practitioner convention, not a published standard.
4. Compare against the window length. **If it does not fit, cut a service out
   of the window. Do not shrink observation time to make the arithmetic work.**

**The hard stop** is one wall-clock time for the whole window, set once, in the
plan. Reaching it with gates incomplete triggers the reverse-order rollback
path from Step 6. Extending past it is allowed, but only as an explicit
DECISION gate called by the same named release authority, recorded in the log
with a reason. Emergency acceleration follows the same rule: define in advance
"who can approve SDP acceleration in an emergency and the criteria that must be
met for acceleration to be approved"
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).

## Step 5 - Write the rollback trigger for each gate

Every gate gets a trigger, written before the window, with three parts:

| Part | Example |
|---|---|
| **Observable condition** | "checkout smoke suite fails, or 5xx rate above 1 percent sustained 5 minutes" |
| **Who evaluates it** | one named person, usually the gate's DECISION owner |
| **What evidence they read** | the specific dashboard, log query, or suite output, named in the plan |

Trigger classes worth covering per service:

| Class | Typical condition |
|---|---|
| Smoke failure | The service's own post-cutover suite does not pass |
| Reliability signal | Error rate or availability outside the agreed band |
| Latency signal | A named percentile beyond its agreed band |
| Data correctness | Reconciliation mismatch, pipeline lag beyond an agreed bound |
| Dependency saturation | A downstream service degraded by the new traffic shape |
| External signal | Support volume, a partner report, a customer escalation |
| Timebox | The gate did not clear by its clock time |

Two things the trigger text must not do:

- **It must not name an action.** "Roll back if error rate above 1 percent" is
  wrong. "Error rate above 1 percent puts a recovery decision to the release
  authority" is right. The reason is the governing rule stated above: rollback,
  roll forward, and redeploy-known-good are three different recoveries, and a
  threshold cannot pick among them
  ([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
- **It must not be a feeling.** "If it looks unhealthy" is not a trigger.
  Someone at 02:00 has to evaluate it identically to how you would.

Rollback itself, when chosen, is a planned reversible action rather than an
improvisation. That is the whole point of holding the previous version ready:
"if anything goes wrong you switch the router back to your blue environment"
([Martin Fowler, BlueGreenDeployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)),
and for a gradual rollout "the rollback strategy is simply to reroute users
back to the old version until you have fixed the problem"
([Martin Fowler, CanaryRelease](https://martinfowler.com/bliki/CanaryRelease.html)).

## Step 6 - Derive the reverse-order rollback path

**Rollback runs the dependency order backwards.** The service that cut over
last reverses first.

The reason is mechanical, not stylistic. If a dependency reverses while its
dependent is still on the new version, the dependent is now calling a contract
that no longer exists, and you have converted a bad release into an outage. So
reversal is the completed prefix of the gate list, read bottom-up.

To generate it:

1. Take the gate list. Cut it at the gate where the decision is being made.
2. Reverse the completed ACTION gates.
3. Keep parallel tracks independent: a track with no edge to the failing
   service reverses only if the decision says the whole window reverses.
4. Assign each reverse step an owner. Default to the person who executed the
   forward action, because they have the context and the access.
5. Give each reverse step its own confirmation before the next one starts. A
   rollback sequence with no confirmations is a second uncontrolled cutover.

**Mark the irreversible gates.** Some forward actions do not reverse
mechanically, and the plan is dishonest if it implies they do. Stateful changes
are the usual case: "Rolling back changes, especially database, schema, or
other stateful component changes, can be complex"
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
For any gate whose forward action writes state in a shape the old version
cannot read:

- Label the row `POINT OF NO RETURN` in the gate table.
- State in the plan that once this gate passes, recovery for that service means
  roll forward, not reverse.
- Prefer to have removed the problem before the window, using the
  schema-supports-both-versions approach from Step 1
  ([Martin Fowler, BlueGreenDeployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)).

## Step 7 - Check the plan before the window opens

Run the plan against these invariants. Every one is a defect in the plan, not a
judgment call:

| Check | Fails if |
|---|---|
| Ownership | Any gate has zero owners, two owners, or a team name instead of a person |
| Authority | More than one person owns DECISION gates without a recorded handoff |
| Ordering | Any dependent service's ACTION gate precedes its dependency's DECISION gate |
| Cycle | The dependency graph is not acyclic |
| Timebox | Any gate has no clock time, or the critical path exceeds the window |
| Hard stop | The window has no single hard-stop time, or no stated consequence for reaching it |
| Trigger | Any gate has no written trigger, or a trigger that names an action instead of a decision |
| Evidence | Any trigger cites no named dashboard, query, or suite |
| Reverse path | The rollback order is not the reverse of the forward order |
| Irreversibility | Any state-writing gate is not marked as a point of no return or explicitly cleared as reversible |
| Availability | Any owner has not confirmed availability for their gate's clock time |

## Worked example

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

## Output template

Produce one document. It is the plan before the window and the record after it.

```markdown
# Release cutover plan - {release_name}

**Window:** {start_utc} to {hard_stop_utc}
**Release authority:** {one named person}
**Hard stop consequence:** reaching {hard_stop_utc} with open gates puts the
full reverse path to the release authority as a decision.

## Rollback rule for this window

Rollback is a decision made by {release authority} on stated evidence.
Thresholds halt the sequence; they do not reverse it. Recovery may be
roll back, roll forward, or redeploy last-known-good, and only the release
authority chooses which.

## Dependency graph

{service -> service edges, one per line}
{parallel tracks listed explicitly}
{preconditions on out-of-window services, each with the person who confirmed it}

## Gate sequence

| Gate | Kind | Step | Depends on | Owner | Timebox (UTC) | Status |
|------|------|------|-----------|-------|---------------|--------|

## Authority table

| Role | Named person | Scope |
|------|--------------|-------|
| Release authority | | all DECISION gates and recovery calls |
| {service} owner | | {gate IDs} execution |

## Rollback triggers

| Gate | Condition that puts a decision on the table | Evaluated by | Evidence | Reverse scope |
|------|--------------------------------------------|--------------|----------|---------------|

## Reverse path

{completed ACTION gates in reverse order, one owner per step,
 confirmation required between steps}
{gates marked POINT OF NO RETURN and what recovery means past them}

## Runtime log

| Time (UTC) | Gate | Action | Verdict | Evidence | Called by |
|------------|------|--------|---------|----------|-----------|
```

Update the `Status` column and append to the runtime log in place as the window
runs. Authority handoffs are log rows. At close, the document is the release
record, and the coupling that forced a coordinated window is worth carrying
into the retrospective.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| A metric threshold wired to automatic rollback | The threshold cannot choose between rolling back, rolling forward, and redeploying known-good, and in a multi-team window it cannot know how many other teams must reverse with it | Thresholds halt and page; the named release authority decides (see the rule section) |
| One org-wide go or no-go at the end of the window | Failures surface only after every service has cut over, so the reverse path is at its longest and most entangled | A DECISION gate per service, in dependency order, before its dependents start |
| A gate owned by a team name or a rota alias | At 02:00 nobody is sure who is allowed to say stop, and two people act concurrently | Exactly one named person per gate, availability confirmed in advance |
| Timeboxes with no hard-stop policy | Teams read a timebox as a target, gates slip individually, and the window silently overruns | One hard-stop time for the window with a stated consequence, and extension only as its own DECISION gate |
| Rolling back in forward order | The dependency reverses while its dependent still calls the new contract, turning a bad release into an outage | Reverse the completed prefix of the gate list, confirming each step |
| A rollback list with scope but no order and no owners | The reverse becomes a second uncontrolled cutover under time pressure | Ordered reverse steps, one owner each, confirmation between steps |
| A state-writing gate treated as reversible | The plan promises a reversal that physically cannot happen | Mark `POINT OF NO RETURN`, or make the schema support both versions before the window |
| A 10-minute gate described as a bake period | Published guidance measures bake time in hours and days, not minutes, so the window is buying smoke coverage while claiming bake coverage | Call it a smoke check, or split the window so dependents run on a later day |
| A dependency cycle scheduled anyway | The graph cannot be ordered, so the sequence is fiction and the first gate exposes it | Break the cycle before scheduling, with a both-versions-tolerant contract or a flag |

## Limitations

- **No execution.** This produces the plan and the record. Flipping routers,
  running smoke suites, and reading dashboards belong to the owning teams and
  their own tooling.
- **Single-service depth is out of scope.** Pre-flight, canary thresholds,
  statistical promote criteria, and post-release verification for one service
  live in that service's own runbook, run inside its timebox here.
- **Outcomes are reported, not polled.** The runtime log records what owners
  state, with the evidence they cite. It is not a monitoring integration.
- **Cross-timezone availability is flagged, not solved.** The Step 7 check
  surfaces owners who have not confirmed availability for their gate's clock
  time. Resolving that is a scheduling conversation.
- **Shared-database sequencing is a precondition, not a gate.** Schema work
  that must support two application versions simultaneously is resolved with
  the data owner before the window opens.
