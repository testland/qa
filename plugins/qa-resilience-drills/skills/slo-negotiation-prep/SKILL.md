---
name: slo-negotiation-prep
description: "Build-an-X workflow that produces the manager's prep pack for the QA - SRE - Product SLO conversation - current error-budget consumption + MTTR/MTBF trend + a single framed decision question + an explicit 3-5 option matrix with reversibility / stakeholder cost / impact scoring + recommended posture with cited alternatives. Consumes existing SLI / SLO / error-budget math and per-incident MTTR / MTBF metrics rather than computing them. Use when budget is burning or a proposed change will stress the SLO - the output is the evidence pack the manager carries into the meeting, not a recommendation about which option to pick."
---

# slo-negotiation-prep

## Overview

The QA manager is heading into a meeting with SRE and Product. The product team wants to ship Feature X in two weeks. The SRE team's burn-rate alerts have fired three times this quarter. The QA manager's job in that meeting is **not to win** - it is to walk in with structured evidence and explicit options so the team makes a defensible decision the group can stand behind in retro.

This skill produces that prep pack. Per the [Google SRE Workbook](https://sre.google/workbook/implementing-slos/), the error-budget policy needs the agreement of three stakeholders - product manager, product developers, and the production-environment team - and "if all three parties do not agree to enforce the error budget policy, you need to iterate on the SLIs and SLOs until all stakeholders are happy." The conversation is bidirectional: either side can argue for relaxing the SLO if reality has moved.

## When to use

- Error-budget burn-rate alerts have fired; the conversation about freeze vs deprioritise vs renegotiate-SLO is imminent.
- Product proposes an aggressive timeline or a scope expansion that will stress the SLO.
- Quarter-start: SLO targets are being re-set and the team needs evidence-anchored proposals.
- Post-incident: the meeting where stakeholders decide whether the incident's root cause warrants an SLO change.
- Pre-board / pre-leadership review: the manager needs to explain why the team chose the option they chose, with citations.

Do **not** use this skill when:

- No SLO is in place - the team needs to *define* SLOs first; use [`error-budget-tests`](../error-budget-tests/SKILL.md) to author the SLI / SLO / budget structure.
- No decision question is framed - without a specific question ("ship Feature X in 2 weeks?" / "extend budget?" / "lower SLO?"), the prep pack has no shape. The skill halts.
- The team's culture rejects structured negotiation - some shops prefer "the loudest voice wins"; this skill's value is structured evidence; if the meeting doesn't reward that, the skill is wasted effort.

## Step 1 - Capture the inputs

Required:

| Input | Source | Why load-bearing |
|---|---|---|
| **Current SLO + SLI** | [`error-budget-tests`](../error-budget-tests/SKILL.md) configured SLO; cited per the team's runbook | The anchor for everything else |
| **Error-budget consumption to date** | Computed per the [Google SRE Embracing Risk](https://sre.google/sre-book/embracing-risk/) formula: `(target_uptime - actual_uptime)` over the budget window | The starting position |
| **Recent incident history** | [`mttr-mtbf-tracker`](../mttr-mtbf-tracker/SKILL.md) per-incident log; MTTR / MTBF trend over the budget window | Drives the burn-rate narrative and the "what's contributing" detail |
| **The decision question** | Single sentence, manager-supplied (e.g., "Can we ship Feature X in 2 weeks given current SLO posture?") | The skill won't manufacture stakes |
| **Stakeholders** | Who will be in the room (product PM, SRE lead, eng manager, the team's manager, anyone else with veto) | Drives the "stakeholder cost" axis in Step 3 |
| **Time horizon** | When the decision must be made by; how long the consequence lasts (quarter? two quarters? indefinite SLO change?) | Drives reversibility scoring |

The skill halts with `NO_DECISION_FRAMED` if no specific question is offered, or with `MISSING_SLO` if no current SLO is configured.

## Step 2 - Build the current-state evidence pack

The manager walks into the meeting with the data already structured. The pack:

```markdown
## Current state - `<service>` - 2026-07-15 (budget window: 2026-Q3 to date)

### SLO
99.9% successful_requests / total_requests, 30-day rolling window

### Error-budget consumption
- Budget for the quarter: 0.1% × 90 days = ~129.6 minutes of "unreliability allowed"
- Consumed to date (Jul 1 - Jul 15): 73 minutes (56% of quarterly budget in 16% of the quarter)
- **Burn-rate alert status**: SEV2 burn-rate fired 2026-07-08, SEV2 burn-rate fired 2026-07-12 (both per `error-budget-tests` configured alerts)

### MTTR / MTBF trend (2026-Q3 to date)
- MTTR (mean time to recover): 22 minutes (vs 18 min Q2 trailing average)
- MTBF (mean time between failures): 4.1 days (vs 9.2 days Q2 trailing average)
- Trend: **MTBF degrading sharply, MTTR slightly degrading** - frequency is the bigger problem than recovery time

### Top contributing incidents (cited)
- 2026-07-08 - payment-service 5xx surge, 28-min consumption - root cause: third-party provider degradation. Per `mttr-mtbf-tracker` incident #INC-2026-1834.
- 2026-07-12 - cart-service deploy regression, 32-min consumption - root cause: missing migration assertion in canary. Per incident #INC-2026-1851.
- 2026-07-14 - inventory-cache cold-start latency, 13-min consumption - root cause: capacity planning miss. Per incident #INC-2026-1862.

### Source citations
- `error-budget-tests` config: `slo-config.yaml` (commit `e3a91f4`)
- `mttr-mtbf-tracker` incident log: `incidents/2026-Q3.json`
- Alert history: PagerDuty export 2026-07-01..2026-07-15
```

The evidence pack is **read aloud at the start of the meeting** - not as a pitch, but to ensure all stakeholders see the same numbers before anyone proposes an option.

## Step 3 - Frame the decision and enumerate the option matrix

Per the [Google SRE Workbook](https://sre.google/workbook/implementing-slos/), when budget is exhausted (or close to exhausted) the documented standard responses are:

1. "The development team gives top priority to bugs relating to reliability issues over the past four weeks."
2. "The development team focuses exclusively on reliability issues until the system is within SLO."
3. "A production freeze halts certain changes to the system until there is sufficient error budget to resume changes."

The skill extends this canonical 3-option set with two negotiation-specific options:

4. **Extend the budget** (raise the SLO ceiling temporarily) - sometimes called "burn-down deferral."
5. **Lower the SLO** (renegotiate the underlying objective) - appropriate when the original SLO no longer matches user expectations.

The skill emits the option matrix with **explicit scoring** on three axes - impact, reversibility, stakeholder cost:

```markdown
## The decision

**Question:** Can we ship Feature X in 2 weeks given current SLO posture (56% budget consumed in 16% of quarter)?

**Decision deadline:** 2026-07-29 (timeline pressure: Feature X has external launch commitments).

## Option matrix

| # | Option | Impact (user-facing) | Reversibility | Stakeholder cost |
|---|---|---|---|---|
| O1 | **Ship Feature X on the original timeline, accept the burn** | Possible further budget consumption; user-facing if budget exhausts before quarter-end | High - reversible at next budget window | Low product cost; **high SRE cost** (more incidents to triage); medium QA cost |
| O2 | **Defer Feature X by 2 weeks; spend the budget on reliability fixes first** | Lower budget burn; user-facing delay on Feature X | High - defer is reversible; Feature X re-scheduled | High product cost; low SRE cost; low QA cost |
| O3 | **Freeze releases for 1 week, then ship Feature X** (per [Google SRE Workbook](https://sre.google/workbook/implementing-slos/) standard response #3) | One week of zero deploys; reliability investment | High - freeze is by definition temporary | Medium product cost (only 1 week delay); medium SRE cost (compresses fix window) |
| O4 | **Extend the quarterly budget by 30 min** (temporary SLO relaxation) | Allows Feature X to ship without freeze, but sends a signal that SLOs are negotiable under pressure | **Low** - budget extensions tend to become permanent if not reversed at quarter-end | Low product cost short-term; **high SRE cost long-term** (erodes the SLO discipline) |
| O5 | **Lower the SLO to 99.5% permanently** (renegotiate) | Reflects current reality if the 99.9% target was never matched. User-visible if the SLO was published. | **Low** - SLO changes are sticky | High SRE cost (signals defeat); medium product cost (may damage customer commitments); medium QA cost |

**Scoring rubric:**
- **Impact**: how much does this option affect end users? Lower = better.
- **Reversibility**: how easy is it to undo this decision in 2-4 weeks if it was wrong? Higher = better.
- **Stakeholder cost**: weighted cost to each stakeholder (product / SRE / QA). Lower aggregate = better.

The matrix is the decision input; the team picks. No option is auto-recommended in the matrix itself.
```

## Step 4 - Author the recommended posture (with alternatives)

The skill *does* recommend a posture, but always with at least one fallback alternative. The recommendation is anchored on the inputs and cited:

```markdown
## Recommended posture

**Primary recommendation: O3 (1-week freeze + ship Feature X)**

**Why:** 
- Current burn rate (56% in 16% of quarter) projects to ~350% of budget by quarter-end if unmitigated - per `error-budget-tests` projection.
- 2 of the 3 top incidents have known reliability fixes in flight (incidents INC-2026-1851 cart-deploy and INC-2026-1862 inventory-cache); a 1-week focused fix window addresses them.
- Per [Google SRE Workbook](https://sre.google/workbook/implementing-slos/), production freeze is the canonical response: "halts certain changes to the system until there is sufficient error budget to resume changes."
- O3 preserves reversibility (a 1-week freeze is short, easy to extend or shorten).

**Fallback alternative: O2 (defer Feature X by 2 weeks, no freeze)**

**When to fall back:**
- If Product's external commitments cannot accommodate a 1-week-freeze schedule, O2 buys the same reliability time without the freeze signalling cost.
- Trade-off: a longer Feature X delay; the SRE team's fix window is wider but less concentrated.

**Reject these options (with reasoning):**
- **O4 (extend budget)**: budget extensions are sticky per the Workbook's bidirectional-iteration framing; the team should resist short-term SLO relaxation under pressure.
- **O5 (lower SLO permanently)**: not justified by 2 weeks of data; SLO renegotiation requires 1-2 quarters of evidence the target no longer matches reality.

**Stakeholder positions to anticipate:**
- **Product PM**: likely to favour O1 (ship on time, accept burn). The data argument is: 350% projected burn signals systemic risk, not occasional unreliability.
- **SRE lead**: likely to favour O3 or stricter (longer freeze). The middle-ground argument is: O3 gives SRE the focused fix window without weeks of product delay.
- **Engineering manager**: likely neutral; will weight reversibility highest. Both O2 and O3 score well on reversibility.

**What the manager advocates for**: O3 as primary, O2 as the negotiated fallback if Product cannot accept the freeze.
```

The "stakeholder positions to anticipate" section is the **meeting prep** in its purest form - the manager walks in already knowing which positions will be defended and what the rebuttal is.

## Step 5 - Audit appendix

Every numeric and every citation in Steps 2-4 traces to a source artifact:

```markdown
## Audit appendix

| Claim | Source |
|---|---|
| 56% budget consumed by 2026-07-15 | `error-budget-tests` daily snapshot 2026-07-15 |
| 350% projected burn at current rate | Linear extrapolation: 56% × (90/15 days) ≈ 336% - cited to `error-budget-tests` projection function |
| Top incidents | `mttr-mtbf-tracker` incident log 2026-Q3, filter(severity=SEV2, contributed_to_budget=true) |
| Standard responses per SRE Workbook | https://sre.google/workbook/implementing-slos/ §error-budget-policy |
| Reversibility scoring (Step 3) | Heuristic per skill body §Step 3; team can adjust |
| Stakeholder cost (Step 3) | Heuristic; team's actual stakeholder dynamics may differ - flag for confirmation |
| Recommended posture (Step 4) | Cited inline; manager confirms before walking into the meeting |
```

The audit appendix is what the manager shows in retro: "here's why we recommended O3, here's what we said about O4, here's the data we cited." If the team chose O2 instead and the quarter ended badly, the audit traces the decision back to the evidence - not to the manager's gut.

## Worked example summary (compact)

Input: SLO 99.9%, 56% budget consumed at 16% of quarter, Feature X timeline pressure.
Output: 5-option matrix, recommended posture (1-week freeze + ship), fallback (defer 2 weeks no freeze), reject options (extend budget / lower SLO) with cited rationale, anticipated stakeholder positions.

The manager walks in with structured evidence. The meeting decides. The retro can audit the decision against the prep pack.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Recommending an option without naming the fallback | The team feels boxed in; the manager loses negotiation room | Step 4 requires ≥1 fallback alternative |
| Single-option pack ("we should do X") | Frames the meeting as a yes/no on the manager's preference rather than a structured choice | Step 3 requires 3 - 5 options |
| Citing only your team's incidents (no SRE / Product perspective) | The evidence pack reads as advocacy; SRE / Product will reject the framing | Step 2 evidence is jointly sourceable; cite SRE's incident log directly |
| Treating "extend the budget" as cost-free | Per the Workbook's bidirectional framing, budget extensions erode SLO discipline if used reactively | Step 3 scores O4 reversibility as "low" with the cited rationale |
| Lowering the SLO under 2 weeks of pressure | SLO changes are sticky; making them under acute pressure means making them wrong | Step 4 explicitly rejects O5 absent multi-quarter evidence |
| Skipping the "stakeholder positions to anticipate" section | The manager walks in unprepared for the actual debate | Step 4 stakeholder section is required |
| Producing the pack without an audit appendix | The retro cannot trace the decision; future decisions get harder to defend | Step 5 audit is required |
| Auto-advocating for the freeze ("standard response per SRE Workbook") | Standard responses exist for a reason but aren't universal; the team's context drives the actual choice | Recommendations cite the standard but flex to context |
| Treating this skill as a meeting-script | The manager's job is to listen, not to read; the pack is the structured input, not the dialogue | Step 4 ends at "what the manager advocates for" - the meeting is human |

## Limitations

- **Bound by the input quality.** A pack built on stale `mttr-mtbf-tracker` data is misleading; the manager confirms incident-log freshness before the meeting.
- **Heuristic scoring.** The reversibility / stakeholder-cost scores in Step 3 are heuristic - team-specific dynamics (a Product PM with strong leverage, an SRE on PIP) shift the actual cost. Score is the starting point, not the ending point.
- **No real-time data integration.** The skill produces a snapshot prep pack. If the conversation slides (decision deferred, new burn alert fires mid-meeting), the pack ages.
- **Not a substitute for the meeting itself.** Per the SRE Workbook, agreement among the three stakeholders is what creates the policy. The pack structures the input; the agreement happens in the room.
- **No legal / contract escalation path.** Some SLOs are bound by external customer contracts; this skill flags the contract but does not negotiate it.
- **Quarterly window assumed.** Other budget windows (rolling 30-day, monthly) work mechanically; the canonical Google SRE framing uses quarterly.
- **Single-service scope.** Multi-service SLO trade-offs (Service A's budget burn affecting Service B's deploy schedule) require running this skill per service, then a separate cross-service synthesis.

## Hand-off targets

- **Compute / configure the underlying SLI / SLO / budget** → [`error-budget-tests`](../error-budget-tests/SKILL.md).
- **Maintain the per-incident MTTR / MTBF log** → [`mttr-mtbf-tracker`](../mttr-mtbf-tracker/SKILL.md).
- **Ladder the SLO conversation outcome into the quarterly OKR set** → `qa-okr-author` (in the qa-process plugin).
- **Author the underlying test strategy that the SLO references** → `test-strategy-author`.
- **Post-meeting retro on the chosen option's outcome** → `post-mortem-author` when the decision turned out badly; quarterly OKR retro (deferred candidate component) when it played out across the quarter.

## References

- Google SRE Book - *Embracing Risk* chapter (error budget definition, freeze-on-exhaustion policy): https://sre.google/sre-book/embracing-risk/
- Google SRE Workbook - *Implementing SLOs* (SLI / SLO definitions, error-budget policy structure, the bidirectional stakeholder agreement, the canonical three standard responses): https://sre.google/workbook/implementing-slos/
- CTO Craft - *Data-Driven Negotiation with SLIs, SLOs, and Error Budgets* (Part One framing the negotiation; Part Two on the conversation structure this skill mirrors): https://ctocraft.com/blog/data-driven-negotiation-with-slis-slos-and-error-budgets-part-one/
- MIT Sloan Executive Education - *AI Meets Negotiation: Seven Lessons from MIT* (chain-of-thought prompting for option-matrix construction, the methodology underlying Step 3): https://executive.mit.edu/blog/ai-meets-negotiation.html
- Google SRE Book - *Service Level Objectives* chapter (the contract layer SLOs operationalise: an SLA is "an explicit or implicit contract with your users that includes consequences of meeting (or missing) the SLOs they contain"): https://sre.google/sre-book/service-level-objectives/
- ISTQB glossary - non-functional testing (the layer SLOs anchor on): https://glossary.istqb.org/en_US/term/non-functional-testing
- ISO/IEC 25010 - reliability and performance-efficiency characteristics (the underlying quality dimensions): https://en.wikipedia.org/wiki/ISO/IEC_25010
- [`error-budget-tests`](../error-budget-tests/SKILL.md), [`mttr-mtbf-tracker`](../mttr-mtbf-tracker/SKILL.md) - sibling skills that produce the input data this skill consumes.
- `qa-okr-author`, `post-mortem-author` - downstream skills that consume the conversation outcome.
