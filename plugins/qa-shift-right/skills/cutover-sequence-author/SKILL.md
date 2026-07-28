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
recording. DORA sets the opposite target - teams releasing "independently of
the services it depends on" - and names this failure as a "big-bang" deployment
that forces orchestration across many hand-offs and dependencies
([DORA, loosely coupled teams](https://dora.dev/capabilities/loosely-coupled-teams/)).
Sequence the window you have, and put the coupling that forced it into the
post-window record.

## The rule that governs every gate

**Rollback is a named human decision made on evidence. It is never an
automatic metric trigger.**

A threshold being crossed is an input to that decision, not the decision.
Published guidance lists three distinct, non-interchangeable recoveries from a
bad deployment:

- **Rolling back** - undo the changes and revert to the last known working
  configuration.
- **Rolling forward** - address the issue mid-rollout with a hotfix.
- **Deploying new infrastructure** - stand up the last known working
  configuration afresh
  ([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).

Something has to choose between those, and in a multi-team window that choice
also determines how many *other* teams reverse, so it cannot be delegated to a
threshold in one service's monitoring.

What is automatic is the **halt**, not the reversal. When a health signal trips
during a rollout phase, "the rollout should immediately halt" and an
investigation into the alert determines the next course of action
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
constrain is any gate with an observation period: "Bake times should be measured
in hours and days rather than minutes" and should increase per rollout group to
cover different time zones and usage patterns
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).

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

A four-service, three-team window (one dependency chain plus one parallel
track) worked end to end - dependency graph, gate list, rollback triggers, and
the reverse path: [references/worked-example.md](references/worked-example.md).

## Output template

One document that is the plan before the window and the record after it - plan
header, rollback rule, dependency graph, gate sequence, authority table,
rollback triggers, reverse path, and runtime log:
[references/output-template.md](references/output-template.md).

## Anti-patterns

Nine cutover anti-patterns with why each fails and its fix:
[references/anti-patterns.md](references/anti-patterns.md).

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
