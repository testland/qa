# Risk storming - facilitation guide

Deep reference for the `risk-matrix` SKILL.md. How to plan and facilitate the risk-storming session that fills the matrix: meeting structure, participant roster, per-category brainstorm prompts, affinity grouping, impact × likelihood scoring, and mitigation assignment.

Risk-storming is a collaborative exercise where the team brainstorms what
could go wrong with a feature or release. The output feeds directly into the
risk matrix (per SKILL.md Step 2). The format originates from threat modeling
exercises (notably Adam Shostack's *Threat Modeling: Designing for Security*)
and Gojko Adzic's risk-driven testing community, adapted as a general QA
technique.

## When to run a session

- A new feature is about to enter development; the team needs to identify risks proactively.
- A release scope is set; pre-implementation risk review.
- Quarterly: the team revisits its risk register.
- Post-incident: a root cause investigation surfaces new risk categories worth brainstorming.

## Session at a glance

1. Schedule 60-90 min and invite cross-functional participants -
   engineers, one QA / SDET, one PM, plus SRE / Security / Compliance
   when relevant; pre-distribute the spec, acceptance criteria, current
   matrix, and similar postmortems (Step 1).
2. Kick off by presenting the scope and reading the ACs aloud, then run
   a silent brainstorm where each participant lists 5-10 risks (Step 2).
3. Drive the brainstorm with the per-category prompts (Step 3).
4. Affinity-group the raw risks into clusters (Step 4).
5. Score each risk impact (1-5) x likelihood (1-5), capping debate at
   5 min per risk (Step 5).
6. Assign a mitigation + owner + due date for every Critical (>=15) and
   High (9-14) risk (Step 6).
7. Write the results into the risk matrix, open trackers, and schedule
   a one-sprint check-in (Steps 7-8).

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

The facilitator brings prompts to drive the brainstorm, one set per risk
category (categories align with SKILL.md Step 3). The prompts are starters;
the participants extend per the feature.

### Business risks

- "What if the calculation is off by a cent?"
- "What if a customer applies the same code twice?"
- "What if the discount stacks differently than expected?"
- "What's the worst incorrect outcome the customer would see?"

### Technical risks

- "What if the third-party API is down?"
- "What if the DB migration runs partially?"
- "What if two users hit this concurrently?"
- "What's the longest-running query under this feature?"

### Regulatory / compliance risks

- "What if this stores PII?"
- "What if the user is in EU / California?"
- "Are there regional pricing requirements?"

### UX risks

- "What if the user's network is 3G?"
- "What if the user is using a screen reader?"
- "What's the first-time user experience?"

### Security risks

- "What if an attacker controls the input?"
- "What if a logged-in user accesses another user's data?"
- "Where's the auth boundary?"

### Performance risks

- "What's the cold-start time?"
- "What's the per-request latency budget?"
- "What's the concurrent-user ceiling?"

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

The session output flows directly into the matrix per SKILL.md Step 2. The
matrix file becomes the canonical record; the session notes (silent
brainstorm results, discussion points) get attached as appendix.

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
5. **Output** writes the cluster into the matrix as one row per risk,
   and a tracker ticket is opened for Alice's task.

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
