---
name: release-runbook-author
description: "Turns one service's release into a written six-phase runbook: pre-flight checks, a smoke gate, a canary observation window, a named human promote gate, progressive rollout, and post-release verification. Fixes each phase's pass criteria as a delta against a recorded baseline rather than a bare absolute number, gives canary and rollout separate windows and separate thresholds, and emits a per-phase evidence table that becomes the release record. Use when a single service is about to ship and its release steps exist only as tribal knowledge or a chat thread, so nobody can say in advance what evidence promotes it, what evidence halts it, or who decides."
---

# release-runbook-author

## What this owns, and what it does not

This owns the **single-service release runbook**: the ordered phases one
service walks from pre-flight to post-release, the pass criteria written at
each phase, and the way each phase compares what it observes against a
baseline. The failure mode it addresses is a release where the steps live in
someone's head, so "is it healthy?" gets answered by whoever is awake.

It deliberately does **not** own the cross-team sequencing problem: several
interdependent services, owned by several teams, that must change over in a
dependency order inside one shared window. That is `cutover-sequence-author`.
The division is clean: that procedure decides *which service goes when and who
may say stop for the window*; this one is what a single service runs *inside*
the slot it was given. If your release touches one service, you need only this
one.

It also does not own the statistics of canary analysis. Choosing a significance
test, computing effect size, and correcting for the sample-size penalty of a
small traffic share belong to a dedicated statistical comparison procedure.
This runbook says which phase compares what against what, and what the runbook
must state in advance. It stops at the point where you need a p-value.

## The rule that governs every gate

**Rollback is a named human decision made on evidence. It is never an automatic
metric trigger.** A crossed threshold halts the phase and puts a decision in
front of a person; it does not choose the recovery. Published guidance lists
three distinct recoveries from a bad deployment: **rolling back** "by undoing
the changes made in the deployment and reverting back to the last known working
configuration", **rolling forward** "by addressing the issue in the midst of the
rollout", and **deploying new infrastructure** "by using the last known working
configuration"
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
A threshold cannot pick among three options.

What automation owns is the halt. When a health alert fires during a rollout,
"the rollout should immediately halt and an investigation into the cause of the
alert should be performed to help determine the next course of action"
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
So write every threshold in the runbook as a condition that produces a decision,
never as a condition that produces an action.

## Baseline first: the comparison convention every phase uses

The single most common way a release runbook produces a wrong verdict is reading
a production number with nothing to read it against. A 1 percent error rate is
alarming for one service and normal for another, and neither the runbook nor the
person on the call can tell which without a baseline.

**Record the baseline before the deploy starts.** For each metric in the runbook:
the same query, the same aggregation, over a window at least as long as the
phase you will later compare it to. Write the values into the runbook as
literals before phase 1 runs, not from memory afterwards.

Then state every phase's pass criterion as **two** conditions, both of which must
hold:

| Condition | Shape | Catches |
|---|---|---|
| **Absolute floor** | "5xx rate at or below 0.5 percent" | Unacceptable regardless of what the baseline was |
| **Delta against baseline** | "5xx rate at or below 1.5 times baseline" | A real regression that still sits under the absolute floor |

During the canary phase the comparison has a stronger form available, and the
runbook should use it. The canary is defined as "a partial and time-limited
deployment of a change in a service and its evaluation", where "the part of the
service that receives the change is 'the canary,' and the remainder of the
service is 'the control'"
([Google SRE Workbook, Canarying Releases](https://sre.google/workbook/canarying-releases/)).
The control is running concurrently, on the same traffic mix, at the same hour,
so it removes the confounders a time-shifted baseline leaves in. The mechanism
that makes it usable is per-population breakdown: "If we break down metrics by
population servicing the request (the canary versus the control), we can observe
the separate metrics"
([Google SRE Workbook, Canarying Releases](https://sre.google/workbook/canarying-releases/)).
If your dashboards cannot split by deployment version, fix that before writing a
canary phase, because an aggregate number dilutes the canary's signal by exactly
its traffic share.

Which comparison each phase gets:

| Phase | What is observed | Compared against | Comparison shape |
|---|---|---|---|
| 1. Pre-flight | Discrete facts about the build | Nothing | Binary pass or fail, with evidence per row |
| 2. Smoke gate | Suite result on the target environment | The last green run of the same suite | Absolute: zero failures |
| 3. Canary | Metrics of the canary population | The concurrent control population | Absolute floor and ratio to control |
| 4. Promote gate | The canary table plus every anomaly below threshold | The criteria written in advance | Named human decision on stated evidence |
| 5. Rollout | Metrics of the whole service | Recorded pre-deploy baseline window | Absolute floor and ratio to baseline, time-shifted |
| 6. Post-release | The same metrics at window close | The same recorded baseline | Ratio plus an explicit stability statement |

**Say plainly in the runbook that phases 5 and 6 are the weaker comparison.**
Once the canary is promoted there is no concurrent control left, so time of day,
traffic mix, and any unrelated concurrent change are folded into the delta. That
is a reason to keep the canary phase honest, not a reason to skip the later ones.

## Phase 1 - Pre-flight

Pre-flight items are **checks, not actions**. Each row is a fact about the
release that was already true before the runbook opened; the phase confirms it
and records where the confirmation came from. Nothing in pre-flight changes
production.

Rows worth carrying in most runbooks:

| Check | Evidence to record |
|---|---|
| CI green on the release ref | The run URL or command output, not "yes" |
| No open blocking issues for this release | The query and its zero result |
| Schema or data migration verified against a production-shaped copy | The dry-run artifact and the commit it ran at |
| The previous version is retrievable and deployable | Artifact ID of the last known good build |
| Baseline metric values recorded | The literal numbers, with the window they came from |
| Named owner available for the promote gate | Person and their availability window |

The last two are the ones teams skip, and they are the two that make the later
phases meaningless when missing. Pre-deployment checking is the published shape
for this phase: "Establish predeployment checks, including code review, security
scans, and compliance checks, to help ensure that changes are safe to deploy",
with the warning not to lean on one kind of evidence, since "Different tests
catch different classes of failures"
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).

A checklist is the right instrument here rather than judgment: "Checklists are
used to reduce failure and ensure consistency and completeness across a variety
of disciplines", and each entry should be earned, since "every question should
be qualified by its importance to a successful launch"
([Google SRE Book, Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/)).
A pre-flight row that has never once caught anything is a row to delete.

**A failed pre-flight row ends the release at phase 1.** The standard for
this is the same one Scrum applies to unfinished work: "If a Product Backlog
item does not meet the Definition of Done, it cannot be released or even
presented at the Sprint Review. Instead, it returns to the Product Backlog for
future consideration"
([Scrum Guide](https://scrumguides.org/scrum-guide.html)).

## Phase 2 - Smoke gate

A narrow critical-path suite run against the target environment, not the full
regression pack. Its job is to answer "is this build fundamentally functional"
in single-digit minutes, so that a broken build never reaches real users at all.

The runbook records four things and no more: the command, the environment it
targeted, the wall-clock duration, and the result. Everything else goes in the
uploaded artifact.

Pass criterion is **absolute and zero-tolerance: no failures**. This is one of
the few phases where a delta is the wrong instrument. "One more failure than
last time" is not a threshold worth defining, because a smoke suite that
tolerates any failure has stopped being a gate. If a smoke test is flaky, fix or
remove the test before the release, not during it.

Two conventions worth writing down explicitly, both practitioner conventions
rather than published guidance:

- Keep the suite under roughly five minutes. Past that people start skipping it.
- Cap it at the flows whose failure would make you roll back on its own. If a
  failing test would not stop the release, it does not belong in the smoke gate.

Gating each phase of exposure on a health check is the published shape:
"Deployments must pass health checks before each phase of progressive exposure
can begin"
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).

## Phase 3 - Canary observation

Deploy to a small slice, then watch. The purpose is stated precisely in the
original description of the pattern: it reduces risk "by slowly rolling out the
change to a small subset of users before rolling it out to the entire
infrastructure and making it available to everybody", and it provides "early
warning for potential problems before impacting your entire production
infrastructure or user base"
([Martin Fowler, CanaryRelease](https://martinfowler.com/bliki/CanaryRelease.html)).

The runbook fixes four things **before** the deploy, in writing:

1. **Traffic share.** A common starting point is 5 percent. That figure is a
   practitioner convention, not published guidance. The real constraint is
   sample size: a share so small that the canary population produces no
   statistically usable signal is theatre. The published advice on sizing is to
   pick a population that "should be sizeable and last long enough to be
   representative of the overall deployment"
   ([Google SRE Workbook, Canarying Releases](https://sre.google/workbook/canarying-releases/)).
2. **Observation window.** 30 minutes is the widespread convention for an
   interactive web service, and again it is a convention rather than a standard.
   Duration has to follow the system: the window must be long enough to be
   representative, and for a batch system it must cover at least one complete
   work unit ([Google SRE Workbook, Canarying Releases](https://sre.google/workbook/canarying-releases/)).
3. **The metric set.** Prefer metrics with direct user impact, success rate and
   latency first, and exclude metrics with high variance or weak attribution to
   service health ([Google SRE Workbook, Canarying Releases](https://sre.google/workbook/canarying-releases/)).
   Include at least one business outcome metric: reliability and latency can
   both look clean while checkout completion regresses.
4. **The threshold per metric**, in the two-condition form from the baseline
   section above.

**Be honest about what a 30-minute window buys.** It is a smoke-plus-signal
check, not a bake. Published guidance is explicit that "Bake times should be
measured in hours and days rather than minutes" and "should also increase for
each rollout group so that you can account for different time zones and usage
patterns over the course of the day"
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
A runbook that calls half an hour a bake period is mislabelling its own
coverage. Either write "smoke coverage only" next to the window, or schedule a
genuine bake and accept the slower release.

The observation table is the phase's output:

```markdown
### Canary observation - 14:33 to 15:03 UTC, 5 percent traffic

| Metric              | Absolute floor | Ratio limit | Control | Canary | Ratio | Verdict |
|---------------------|----------------|-------------|---------|--------|-------|---------|
| 5xx rate            | 0.5%           | 1.5x        | 0.31%   | 0.42%  | 1.35x | PASS    |
| p95 latency         | 500ms          | 1.2x        | 240ms   | 245ms  | 1.02x | PASS    |
| Checkout completion | 90% min        | 0.95x min   | 92.1%   | 91.2%  | 0.99x | PASS    |
| New error signatures| 0              | n/a         | 0       | 2      | n/a   | ANOMALY |
```

**Surface anomalies that sit below every threshold.** The point of the phase is
early warning, so a signal that is real but under the limit is exactly the
output the phase exists to produce. Two new error signatures with all four
thresholds green is a PROCEED WITH CAUTION verdict carrying a named follow-up,
not a silent PASS.

## Phase 4 - Promote gate

The runbook stops here and does not advance without a named person saying so.
This is the only phase whose output is a human sentence rather than a number.

The gate presents three options, and the reason there are three is the
three-recovery fork from the rule section: a bad canary can be reversed, fixed
forward, or investigated with the canary left in place. The change fail rate
definition carries the same fork, describing deployments that require immediate
intervention, "likely resulting in a rollback of the changes or a 'hotfix' to
quickly remediate any issues"
([DORA software delivery metrics](https://dora.dev/guides/dora-metrics-four-keys/)).

| Option | Means | Written consequence |
|---|---|---|
| `continue` | Promote to rollout with the anomalies acknowledged | Each acknowledged anomaly becomes a named follow-up item |
| `pause` | Extend observation or investigate with the canary still live | New window length and what evidence would end the pause |
| `rollback` | Reverse to the previous version | The reverse steps, from the pre-flight last-known-good artifact |

Three properties this gate must have, all of which are the difference between a
gate and a formality:

- **One named person owns it**, recorded in pre-flight with their availability.
  Not a team, not a channel.
- **The gate holds even when everything is green.** An all-PASS canary table is
  an input to the decision, not a substitute for it. A runbook with an
  auto-promote path for the clean case has no promote gate.
- **The decision is recorded with the evidence it was made on**, so the
  retrospective can ask whether the evidence was sufficient, separately from
  whether the outcome was good.

## Phase 5 - Rollout

Promote outward in stages, smallest blast radius first. The published shape is
exponential expansion from a single unit: "we may push by starting in one
cluster and expand exponentially until all clusters are updated"
([Google SRE Book, Release Engineering](https://sre.google/sre-book/release-engineering/)).
Each stage repeats the phase 3 pattern in miniature: expose, observe, confirm,
expand.

Two things change relative to canary, and the runbook must state both:

- **The comparison weakens.** The control population shrinks with each stage and
  disappears at 100 percent, after which the only reference is the recorded
  pre-deploy baseline. Widen the ratio limits accordingly, and say in the runbook
  that you did and why.
- **The window lengthens.** Later stages carry more users, so their observation
  windows should be longer, not shorter, per the increasing-bake-time guidance
  cited in phase 3
  ([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
  The common runbook error is the opposite: rushing the last stage because the
  first went well.

A threshold trip during rollout halts the expansion and returns to phase 4's
decision table with the current stage as context. It does not reverse anything
by itself.

## Phase 6 - Post-release

The release is not finished when traffic reaches 100 percent. Issues that
surface five to ten minutes after full exposure escape a runbook that closes at
promotion.

Post-release has three outputs:

1. **A final observation window** against the recorded baseline, conventionally
   60 minutes for an interactive service. That figure is a practitioner
   convention. The published criterion is not a clock value but a state: the
   rollout continues when "there are no issues reported by end users and all
   health indicators stay green throughout the bake time", and usage metrics
   belong in the health model "to help ensure that a lack of user-reported issues
   and negative health signals aren't hiding an issue"
   ([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
2. **The administrative tail**, done only after the window closes and not
   before: tag the release, publish the changelog, notify the channel. Tagging
   before observation completes advertises a result you do not have yet.
3. **The follow-up list**, carrying every anomaly acknowledged at phase 4 plus
   every runbook defect the release exposed. Runbook defects are the valuable
   half: a canary window that was too short to surface the anomaly the promote
   gate had to judge is a finding about the runbook, and editing it is part of
   closing the release. Treat that edit as deliberate: "Changes to any aspect of
   the release process should be intentional, rather than accidental"
   ([Google SRE Book, Release Engineering](https://sre.google/sre-book/release-engineering/)).

## Before the runbook is usable

Every row below is a defect in the document, not a judgment call.

| Check | Fails if |
|---|---|
| Baseline | Any metric has a threshold but no recorded pre-deploy value |
| Two-condition thresholds | Any metric has only an absolute floor, or only a ratio |
| Population split | A canary threshold exists but dashboards cannot break down by version |
| Separate windows | Canary and rollout share one window length or one threshold set |
| Window honesty | A sub-hour window is described as a bake period |
| Promote owner | Phase 4 names a team or a channel instead of one person |
| Gate integrity | Any path promotes without the phase 4 decision, including the all-green path |
| Trigger wording | Any threshold is written as an action rather than as a decision |
| Evidence | Any phase says PASS without naming the query, suite, or dashboard behind it |
| Reversibility | The last known good artifact is not identified in pre-flight |
| Business metric | The canary metric set contains no user-outcome metric |

## Worked example

Service `checkout-api`, release `v1.4.5`, single service, no cross-team
dependencies.

**Baseline recorded at 13:55 UTC, 60-minute window:** 5xx rate 0.31 percent,
p95 latency 240ms, checkout completion 92.1 percent, distinct error signatures 41.

**Phase 1, pre-flight.**

| Check | Verdict | Evidence |
|---|---|---|
| CI green on `release/v1.4.5` | PASS | `gh run list --branch release/v1.4.5 --limit 1`, run 8841 green |
| Blocking issues closed | PASS | `gh issue list --label blocker --milestone v1.4.5` returns 0 |
| Migration dry run | PASS | `migration-dry-run` artifact at `abc123` |
| Last known good retrievable | PASS | Artifact `checkout-api:1.4.4` |
| Baseline recorded | PASS | Values above, 12:55 to 13:55 UTC |
| Promote owner available | PASS | Priya, 14:00 to 17:00 UTC |

**Phase 2, smoke gate.** `npm run smoke -- --target=staging`, 4m32s, 22 tests,
0 failures. PASS.

**Phase 3, canary.** 5 percent traffic from 14:33, 30-minute window, labelled
in the runbook as smoke coverage rather than a bake. Table as shown in phase 3
above: all four thresholds green, two new error signatures observed.

```text
NullPointerException at Cart.addItem:42   1 occurrence, absent from control
RateLimitExceeded                          1 occurrence, present in control at similar rate
```

Verdict: **PROCEED WITH CAUTION**. The rate-limit signature also appears in the
control, so it is not attributable to the change. The null-pointer signature is
absent from the control population and is therefore a real delta, below every
threshold.

**Phase 4, promote gate.** Priya, 15:05 UTC, chose `continue`, on the evidence
of the canary table plus the two signatures. The null pointer became follow-up
item 1.

**Phase 5, rollout.** 25 percent at 15:08, observed 20 minutes, ratios within
widened limits. 100 percent at 15:30.

**Phase 6, post-release.** 60-minute window to 16:30 against the 13:55
baseline: 5xx 0.33 percent (1.06x), p95 244ms (1.02x), checkout completion 92.0
percent (1.00x). Stable. Tag, changelog, and notification issued at 16:32.
Follow-ups: the null pointer, plus a runbook defect - a 30-minute canary was too
short to accumulate enough occurrences of the new signature for the promote gate
to judge it confidently, so the canary window for this service moves to 60
minutes.

## Output template

One document. It is the plan before the release and the record after it.

```markdown
# Release runbook - {service} {version}

**Promote-gate owner:** {one named person, availability window}
**Last known good artifact:** {id}
**Recovery rule:** a crossed threshold halts the phase and puts a recovery
decision to {owner}. Recovery may be roll back, roll forward, or redeploy
last known good, and only {owner} chooses which.

## Baseline - recorded {window} before deploy

| Metric | Value | Query |
|--------|-------|-------|

## Thresholds

| Metric | Absolute floor | Ratio limit (canary vs control) | Ratio limit (rollout vs baseline) |
|--------|----------------|----------------------------------|------------------------------------|

## Phase 1 - Pre-flight

| Check | Verdict | Evidence |
|-------|---------|----------|

## Phase 2 - Smoke gate

**Command:** **Environment:** **Duration:** **Result:**

## Phase 3 - Canary  ({share} traffic, {window}, coverage: smoke | bake)

| Metric | Absolute floor | Ratio limit | Control | Canary | Ratio | Verdict |
|--------|----------------|-------------|---------|--------|-------|---------|

**Anomalies below threshold:**
**Verdict:** PASS | PROCEED WITH CAUTION | HALT

## Phase 4 - Promote gate

**Decision:** continue | pause | rollback
**Made by:** **At:** **On this evidence:**
**Acknowledged anomalies carried forward:**

## Phase 5 - Rollout

| Stage | Share | Window | Metrics vs baseline | Verdict |
|-------|-------|--------|---------------------|---------|

## Phase 6 - Post-release

| Metric | Baseline | Observed | Ratio | Verdict |
|--------|----------|----------|-------|---------|

**Administrative tail:** tag / changelog / notification, each with a timestamp.

## Follow-ups

- [ ] {product defects acknowledged at the promote gate}
- [ ] {runbook defects the release exposed}
```

## Anti-patterns

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

## Limitations

- **No execution.** This produces the runbook and the record. Deploying,
  running suites, and querying dashboards belong to the service's own tooling.
- **Statistics are out of scope.** Significance tests, effect size, and the
  sample-size penalty of a small traffic share need a dedicated comparison
  procedure. This document defines what is compared, not how confident the
  comparison is.
- **Cross-team sequencing is out of scope.** Ordering interdependent services
  across teams inside one window is `cutover-sequence-author`. This runbook runs
  inside whatever slot that plan assigns.
- **Low-traffic services get a weak canary.** A small share of small traffic
  produces no usable signal, and no threshold wording fixes that. Consider
  traffic shadowing or a longer window before writing canary criteria you cannot
  evaluate.
- **Windows are configuration, not adaptation.** A pre-holiday or Friday release
  may warrant longer observation. Encode that in the runbook per release; the
  template will not infer it.
- **Stateful changes may not reverse.** Where a phase writes data the previous
  version cannot read, the `rollback` option at phase 4 is unavailable and the
  runbook should say so at that phase rather than implying a reversal that
  cannot happen.
