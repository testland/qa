---
name: risk-storming-facilitator
description: "Reference guide for planning and facilitating a risk-storming session yourself - meeting structure, participant roster, per-category brainstorm prompts (categories from risk-matrix), affinity grouping, impact by likelihood scoring, and mitigation assignment. Static reference only, not an active runner that writes the matrix file. Use to learn or teach the facilitation pattern, or to run a feature-kickoff session without agent assistance. For the matrix artifact itself use risk-matrix, to calibrate its ratings against real defect data use risk-matrix-calibration, and to map the resulting risks onto test coverage use risk-coverage-mapper."
---

# risk-storming-facilitator

## Overview

Risk-storming is a collaborative exercise where the team
brainstorms what could go wrong with a feature or release. The
output feeds directly into the risk matrix (per
`risk-matrix`).

The format originates from threat modeling exercises (notably
Adam Shostack's *Threat Modeling: Designing for Security*) and
Gojko Adzic's risk-driven testing community, adapted as a general
QA technique.

## When to use

- A new feature is about to enter development; the team needs to
  identify risks proactively.
- A release scope is set; pre-implementation risk review.
- Quarterly: the team revisits its risk register.
- Post-incident: a root cause investigation surfaces new risk
  categories worth brainstorming.

## How to use

1. Schedule 60-90 min and invite cross-functional participants -
   engineers, one QA / SDET, one PM, plus SRE / Security / Compliance
   when relevant; pre-distribute the spec, acceptance criteria, current
   matrix, and similar postmortems (Step 1).
2. Kick off by presenting the scope and reading the ACs aloud, then run
   a silent brainstorm where each participant lists 5-10 risks (Step 2).
3. Drive the brainstorm with the per-category prompts in
   [references/category-prompts.md](references/category-prompts.md)
   (Step 3).
4. Affinity-group the raw risks into clusters (Step 4).
5. Score each risk impact (1-5) x likelihood (1-5), capping debate at
   5 min per risk (Step 5).
6. Assign a mitigation + owner + due date for every Critical (>=15) and
   High (9-14) risk (Step 6).
7. Write the results into the risk matrix (per `risk-matrix`), open
   trackers, and schedule a one-sprint check-in (Steps 7-8).

## Step 1 - Pre-session setup

Schedule 60-90 min. Invite:

- 2-4 engineers (product code knowledge)
- 1 QA / SDET
- 1 PM (business context)
- Optional: SRE / Security / Compliance (if relevant)

Pre-distribute:

- The feature spec / story
- The acceptance criteria
- The current risk matrix (for the area, if exists)
- Recent incident postmortems for similar features

## Step 2 - Session structure

```
00:00-00:05  Kickoff: facilitator presents the feature scope; reads ACs aloud
00:05-00:25  Silent brainstorm: each participant lists 5-10 risks (post-its or shared doc)
00:25-00:40  Affinity grouping: cluster risks by category
00:40-00:55  Score each risk: impact (1-5) × likelihood (1-5)
00:55-01:15  Mitigation discussion + owner assignment
01:15-01:30  Review + close: confirm action items
```

The silent-brainstorm phase is critical - without it, the loudest
voice dominates and group-think hides real risks.

## Step 3 - Prompts per category

The facilitator brings prompts to drive the brainstorm, one set per
risk category (categories align with `risk-matrix`). The full prompt
bank - business, technical, regulatory / compliance, UX, security, and
performance - is in
[references/category-prompts.md](references/category-prompts.md). The
prompts are starters; the participants extend per the feature.

## Step 4 - Affinity grouping

After the silent brainstorm, cluster:

```
Cluster: "Payment failures"
- Stripe webhook delivery failure
- Stripe API rate limit
- Customer card declined mid-checkout
- Customer cancels mid-checkout (browser back button)

Cluster: "Promo math"
- Off-by-cent rounding
- Stack two promos
- Apply expired promo
- Apply promo to free-shipping order

Cluster: "EU compliance"
- VAT calculation
- GDPR data export
- Cookie consent

Cluster: "..."
```

Clusters reveal that some risks are different facets of one
underlying issue (e.g., "payment failures" is one architectural
concern; mitigations may apply across the cluster).

## Step 5 - Score

Per cluster (or per-row if the cluster has heterogeneous risks):

| Risk                                | Impact (1-5) | Likelihood (1-5) | Score |
|-------------------------------------|-------------:|-----------------:|------:|
| Off-by-cent rounding                 |       5      |        3         |   15  |
| Stack two promos                     |       4      |        4         |   16  |
| ... (one row per risk)               |              |                  |       |

The team agrees on each score via brief discussion (5 min cap per
risk). When discussion exceeds the cap, the facilitator notes the
disagreement and moves on; revisit after the session.

## Step 6 - Mitigations + owners

For each Critical (>=15) and High (9-14) risk:

| Risk                          | Mitigation                                | Owner | Due       |
|-------------------------------|-------------------------------------------|-------|-----------|
| Off-by-cent rounding           | Property-based tests on rounding           | Alice | 2026-05-15 |
| Stack two promos               | Add validation + integration test          | Bob   | 2026-05-12 |
| Stripe webhook delivery failure| Retry + DLQ + chaos test                  | Carol | 2026-05-12 |

Lower-priority risks (Medium / Low) get logged but may not get
immediate mitigations.

## Step 7 - Output to the risk matrix

The session output flows directly into the matrix per
`risk-matrix`. The matrix file becomes
the canonical record; the session notes (silent brainstorm
results, discussion points) get attached as appendix.

## Step 8 - Post-session

Within 1 day:

- Author / update the risk matrix file.
- Create tracker tickets for each action item.
- Schedule a 15-min check-in 1 sprint later to verify mitigations
  shipped.

A risk-storming session without follow-up is wasted.

## Worked example

A team is about to build checkout promo codes. In the kickoff session:

1. **Silent brainstorm** surfaces (among others) "off-by-cent rounding
   when a percentage promo is applied" and "two promos stacked on one
   order."
2. **Affinity grouping** puts both under a "Promo math" cluster.
3. **Scoring** rates off-by-cent rounding impact 5 (wrong charge,
   refunds, trust) x likelihood 3 = 15, which lands as Critical.
4. **Mitigation** assigns "property-based tests on the rounding
   function" to Alice, due 2026-05-15.
5. **Output** writes the cluster into the matrix (per `risk-matrix`) as
   one row per risk, and a tracker ticket is opened for Alice's task.

The session ends with a scored, owned Critical risk and a matrix row -
not a vague "we should test rounding" note.

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Skipping the silent-brainstorm phase                                  | Loudest voice dominates; quiet engineers' risks invisible.               | 20-min silent brainstorm (Step 2). |
| Single-person facilitator + scribe + participant                       | Facilitator can't focus; participants distracted.                         | Separate facilitator + note-taker. |
| Open-ended "what could go wrong?" without prompts                      | Participants stare blankly; brainstorm thin.                             | Use category prompts (Step 3). |
| Skipping mitigation step                                                | Risks identified; no action.                                              | Mitigation + owner per Critical/High (Step 6). |
| Scoring debates that exceed time cap                                    | Session runs long; later risks get less time.                            | 5-min cap per risk; flag disagreements (Step 5). |
| Single-team session                                                     | Misses cross-team risks (security, compliance, infrastructure).          | Invite across functions (Step 1). |
| Risks logged but not in the matrix                                      | Lost; same risks re-discovered next quarter.                             | Update the matrix (Step 7). |
| No post-session follow-up                                               | Mitigations don't ship; team distrusts the process.                      | Sprint check-in (Step 8). |

## Limitations

- **Time investment.** 60-90 min × ~5 people = 5-7.5 person-hours
  per session. Don't run weekly.
- **Facilitator skill matters.** A weak facilitator produces a
  weak session.
- **Group-think risk.** Even with silent brainstorm, group dynamics
  can suppress disagreement. Encourage explicit "I disagree"
  framing.
- **Doesn't predict unknown unknowns.** Risk storming addresses
  identified risk classes; new ones emerge from incidents.

## References

- Adzic, G. on risk-driven testing - community references at
  `gojko.net`.
- Shostack, A., *Threat Modeling: Designing for Security* (2014) - 
  foundational for the structured prompt approach.
- `risk-matrix` - the artifact this
  session produces.
