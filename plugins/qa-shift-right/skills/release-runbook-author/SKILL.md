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
three distinct recoveries from a bad deployment: **rolling back** (undo the
changes, revert to the last known working configuration), **rolling forward**
(fix the issue mid-rollout with a hotfix), and **deploying new infrastructure**
(stand up the last known working configuration afresh)
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
A threshold cannot pick among three options.

What automation owns is the halt: when a health alert fires, "the rollout should
immediately halt" and an investigation determines the next course of action
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).
So write every threshold in the runbook as a condition that produces a decision,
never one that produces an action.

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
phases meaningless when missing. Establish predeployment checks (code review,
security scans, compliance checks), since "Different tests catch different
classes of failures"
([Azure Well-Architected, safe deployment practices](https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments)).

A checklist beats judgment here, and each entry should be earned: "Every
question's importance must be substantiated, ideally by a previous launch
disaster"
([Google SRE Book, Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/)).
A pre-flight row that has never once caught anything is a row to delete.

**A failed pre-flight row ends the release at phase 1**, the same standard Scrum
applies to work that does not meet the Definition of Done: it "cannot be
released" and returns to the backlog
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
check, not a bake: "Bake times should be measured in hours and days rather than
minutes" and should increase per rollout group to cover time zones and usage
patterns
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

Service `checkout-api`, release `v1.4.5`, single service, walked through all six
phases from baseline to post-release follow-ups:
[references/worked-example.md](references/worked-example.md).

## Output template

One document that is the plan before the release and the record after it -
header and recovery rule, baseline, thresholds, the six phase tables, and the
follow-up list: [references/output-template.md](references/output-template.md).

## Anti-patterns

Eleven runbook anti-patterns with why each fails and its fix:
[references/anti-patterns.md](references/anti-patterns.md).

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
