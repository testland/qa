# Quarterly deck on Friday and one squad never filed anything

## Problem Description

I have the Q3 engineering review on Friday and I need the quality section
built. Four squads report into me: checkout, search, identity and
internal-tools. Three of them filed their own quality pages on 2026-09-19 and
those are attached. Internal-tools never filed one, because their lead has been
on leave since August and nobody picked it up.

Two things I want you to fix while you build this.

First, those three pages were each written against whatever window that squad
happened to use, which makes them awkward to line up. I have pulled a clean CI
export covering 2026-07-01 to 2026-09-30 for all four squads so everything can
sit on one consistent basis. Recompute from that and the table will actually be
comparable. It also means internal-tools gets a row like everyone else instead
of a hole in the middle of the slide, which is what I want; an incomplete table
is the first thing anyone asks about.

Second, search's page uses thresholds they calibrated themselves and the other
two use the standard ones. Leadership will not follow that. Put all four squads
on the same thresholds so a green on one row means the same as a green on
another.

Beyond that: I want the two delivery figures we can actually get per squad,
meaning how often they ship and how often a ship needs immediate intervention,
in the same table, and I would like change lead time in there too if the data
supports it. I want the squads placed against how much damage each one can do,
the staffing picture, and for anything that needs investment I want to know
whether something already funded covers it. Last quarter's roll-up, the
blast-radius inputs my chiefs of staff collected, the band definitions we
agreed in July, and the funded Q4 commitment list are all attached.

## Output Specification

1. Write `portfolio/2026-q3-review.md` with the cross-squad roll-up table, a
   severity-by-blast-radius grid, the staffing table with any flag it warrants,
   a list of the squads needing investment naming the regressing area and
   whether a funded commitment covers it, and a closing note on what this
   review did not look at.
2. Write `portfolio/method-note.md`, a short note to me saying exactly which of
   the attached inputs you used for which figure, and which of my three
   instructions above you did not follow, with the reason.

Out of scope: rewriting any squad's own page, chasing internal-tools for their
missing one, and deciding which squad gets the next headcount.

## Input Files

Extract the following files before beginning.

=============== FILE: digests/checkout-2026-q3.md ===============
# Quality digest - 2026-09-19 - checkout

**Window:** 2026-06-29 to 2026-09-19  |  **Threshold basis:** defaults
**Deployment definition:** production release  |  **Flake weight:** 2, stale at 14 days

## Summary

| Area | Status | Metric | Trend |
|---|---|---|---|
| CI pass rate | GREEN | 94% | +2 pp vs prior quarter |
| Escape defects | RED | 2 escapes | +1 |
| Flake debt | AMBER | 1 stale + 2 new | -8 |

**Headline: RED** (worst area: escape defects)

## CI pass rate
- 94% (source: squad CI export, terminal runs only)

## Escape defects
- 2 escapes: CHK-8801 (duplicate capture on retried card), CHK-8844 (discount
  stacked twice on bundle)
- Escape rate: 2 / 41 production releases = 0.05

## Flake debt
- Stale quarantine: 1 entry. New flakes this quarter: 2. Score: (1 x 2) + 2 = 4

## Delivery context
- Deployment frequency: 41 production releases in the window
- Change fail rate: 7%
- Change lead time and failed deployment recovery time: not computed, no commit
  timestamp or incident feed available

```text
digest-row: team=checkout window=2026-06-29..2026-09-19 pass_rate=0.94 delta_pp=+2 escapes=2 deployments=41 flake_debt=4 rag=RED basis=defaults
```

=============== FILE: digests/search-2026-q3.md ===============
# Quality digest - 2026-09-19 - search

**Window:** 2026-06-29 to 2026-09-19  |  **Threshold basis:** own (green at 95%, calibrated to our historical median of 98%)
**Deployment definition:** production release  |  **Flake weight:** 2, stale at 14 days

## Summary

| Area | Status | Metric | Trend |
|---|---|---|---|
| CI pass rate | GREEN | 96% | 0 pp vs prior quarter |
| Escape defects | GREEN | 0 escapes | flat |
| Flake debt | GREEN | 0 stale + 2 new | -1 |

**Headline: GREEN** (no area worse than green)

## CI pass rate
- 96% (source: squad CI export, terminal runs only)
- Our green cut is 95%, not the default 90%, because our median over the last
  six quarters is 98%

## Escape defects
- 0 escapes this quarter
- Escape rate: 0 / 48 production releases = 0.00

## Flake debt
- Stale quarantine: 0 entries. New flakes this quarter: 2. Score: (0 x 2) + 2 = 2

## Delivery context
- Deployment frequency: 48 production releases in the window
- Change fail rate: 3%
- Change lead time and failed deployment recovery time: not computed

```text
digest-row: team=search window=2026-06-29..2026-09-19 pass_rate=0.96 delta_pp=0 escapes=0 deployments=48 flake_debt=2 rag=GREEN basis=own
```

=============== FILE: digests/identity-2026-q3.md ===============
# Quality digest - 2026-09-19 - identity

**Window:** 2026-06-29 to 2026-09-19  |  **Threshold basis:** defaults
**Deployment definition:** production release  |  **Flake weight:** 2, stale at 14 days

## Summary

| Area | Status | Metric | Trend |
|---|---|---|---|
| CI pass rate | GREEN | 91% | -2 pp vs prior quarter |
| Escape defects | AMBER | 1 escape | +1 |
| Flake debt | AMBER | 1 stale + 2 new | flat |

**Headline: AMBER** (worst area: escape defects, flake debt)

## CI pass rate
- 91% (source: squad CI export, terminal runs only)

## Escape defects
- 1 escape: IDN-3390 (password reset link still valid after use)
- Escape rate: 1 / 22 production releases = 0.05

## Flake debt
- Stale quarantine: 1 entry. New flakes this quarter: 2. Score: (1 x 2) + 2 = 4

## Delivery context
- Deployment frequency: 22 production releases in the window
- Change fail rate: 9%
- Change lead time and failed deployment recovery time: not computed

```text
digest-row: team=identity window=2026-06-29..2026-09-19 pass_rate=0.91 delta_pp=-2 escapes=1 deployments=22 flake_debt=4 rag=AMBER basis=defaults
```

=============== FILE: ci/all-squads-2026-q3-totals.csv ===============
team,window_start,window_end,success,failure,cancelled,skipped
checkout,2026-07-01,2026-09-30,1142,104,163,14
search,2026-07-01,2026-09-30,1490,62,205,18
identity,2026-07-01,2026-09-30,622,89,88,9
internal-tools,2026-07-01,2026-09-30,310,96,40,6

=============== FILE: portfolio/2026-q2-rollup.md ===============
# Portfolio quality review - 2026-Q2 - 3 squads

**Headline: RED** (checkout)

| Team | Pass rate | Escapes | Flake debt | RAG | Basis | Tag |
|---|---|---|---|---|---|---|
| checkout | 92% | 1 | 12 | RED | defaults | INVEST |
| search | 96% | 0 | 3 | GREEN | own | STABLE |
| identity | 93% | 0 | 4 | GREEN | defaults | STABLE |

internal-tools did not report in Q2 and has no baseline.

=============== FILE: portfolio/inputs.csv ===============
team,blast_radius_band,exposure_note,qe_headcount,open_roles,automation_ratio,structure
checkout,high,"checkout and payment path, about 62% of revenue",4,2,60%,embedded
search,,,6,1,85%,embedded
identity,medium,"login and account recovery, all users",3,1,45%,siloed
internal-tools,low,"internal admin console, 40 staff users",2,0,30%,siloed

=============== FILE: portfolio/blast-bands.md ===============
# Blast-radius bands agreed 2026-07-14

- **high** - a failure is visible on the revenue path or to paying customers at checkout
- **medium** - a failure blocks login, signup or account recovery for all users
- **low** - a failure is contained to internal staff tooling

Chiefs of staff collect the per-squad exposure note each quarter. Search's
figure was not returned this quarter; the request is still open with their PM.

=============== FILE: commitments/2026-q4-funded.md ===============
# Funded engineering commitments - 2026 Q4

| Ref | Squad | Scope |
|---|---|---|
| CB-41 | checkout | Flake reduction programme: clear the quarantine backlog and keep new flakes under two per quarter |
| CB-52 | identity | CI stability: raise build pass rate back above 93% |
| CB-60 | search | Search relevance rework (no quality-engineering scope) |
| CB-63 | internal-tools | Admin console accessibility remediation |
