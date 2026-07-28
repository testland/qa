# Worked example (illustrative, dated)

A complete run of `slo-negotiation-prep` for one scenario: SLO 99.9%, 56% of the
quarterly error budget consumed at 16% of the quarter, with Feature X under a
two-week timeline pressure. The dates and incident ids below (2026-Q3,
`INC-2026-18xx`, commit `e3a91f4`) are **sample values for this one run** -
substitute your own service, window, and incident log. The example walks Steps 2
to 5 end to end.

## Step 2 output - current-state evidence pack

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

## Step 3 output - filled option matrix

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
```

## Step 4 output - recommended posture

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

## Step 5 output - audit appendix

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

Summary: 5-option matrix, recommended posture (1-week freeze + ship), fallback
(defer 2 weeks, no freeze), rejected options (extend budget / lower SLO) with
cited rationale, and anticipated stakeholder positions. The manager walks in with
structured evidence; the meeting decides; the retro audits the decision against
the pack.
