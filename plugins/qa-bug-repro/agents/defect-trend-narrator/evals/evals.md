---
component: defect-trend-narrator
type: agent
archetype: A1
---

# defect-trend-narrator — evals

Companion eval cases for [`defect-trend-narrator`](../../defect-trend-narrator.md).
Three cases cover happy path / branch / adversarial: a two-window WoW
trend with a Pareto breakdown and movers (canonical narrative), an
escape-rate path triggered when `found_in` metadata is present, and a
single-window input that must be labeled `snapshot, not trend` rather
than fabricating a trend. Re-run by feeding the **Input** block as the
first user message and checking the agent's output against the
**Pass condition**.

## Eval 1 — happy path — two-window WoW trend with Pareto + movers

**Input:**

```
Run the weekly defect review. Window: 2026-W18 (2026-04-27..2026-05-03)
vs prior window 2026-W17 (2026-04-20..2026-04-26). Input is a tracker
export (linear-export-2026-W18.json) already categorised by tracker
labels. Pre-counted summary below:

This window (2026-W18) — 47 defects total:
  regression:    18  (38.3%)
  integration:   13  (27.7%)
  environment:    6  (12.8%)
  data:           4   (8.5%)
  race:           3   (6.4%)
  performance:    2   (4.3%)
  other:          1   (2.1%)

Prior window (2026-W17) — 42 defects total:
  regression:    11  (26.2%)
  integration:   14  (33.3%)
  environment:    9  (21.4%)
  data:           5  (11.9%)
  race:           1   (2.4%)
  performance:    2   (4.8%)
  other:          0   (0.0%)

Release events from git log this window:
  v4.7.0 shipped 2026-04-29 (mid-window) — feature flag rollout for
  checkout.

The export does NOT include found_in / discovered_by metadata —
escape rate is not computable for this dataset.

MTTD / MTTF: not computable (no closed_at timestamps in this export).
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 uses the tracker categories directly (already
categorised input). Step 2 computes total 47, prior 42, Δ +5 (+11.9%);
Pareto sort identifies regression (38.3%) + integration (27.7%) +
environment (12.8%) = 78.8% — the smallest k accounting for ≥80% (with
data added it becomes 87.3%). Top-3 movers up: regression (+7pp), race
(+4pp), other (+2pp). Top-3 movers down: environment (-9pp), integration
(-6pp), data (-3pp). Step 3 emits the four sections — headline like
"2026-W18 defect review: 47 defects (+11.9% WoW) — 3 categories account
for ~79% of volume" with the Pareto reference; movers paragraph
correlates the regression spike with the v4.7.0 release on 2026-04-29
(mid-window). Step 4 emits a citation appendix mapping each claim to
its source. Escape rate and MTTD are emitted as `n/a` per the
refuse-to-fabricate rule. The narrative does NOT recommend specific
tests, fixes, or process changes; it points at downstream agents for
deeper investigation.

**Pass condition:** Output contains the substring `Pareto` AND mentions
the regression category as the top mover up (e.g. text near `regression`
with `+7` or `up`). Output contains `n/a` for escape rate (the input
explicitly lacks `found_in` metadata, and the agent must not guess).
Output does NOT contain a sentence prescribing a specific fix, test
addition, or process change (the agent narrates; the team decides).

## Eval 2 — branch — escape-rate path (found_in metadata supplied)

**Input:**

```
Monthly defect review. Window: 2026-04-01..2026-04-30 vs prior month
2026-03-01..2026-03-31. The Jira export DOES include the found_in field.

This window (April) — 120 defects total:
  found_in = production:  18
  found_in = staging:     42
  found_in = dev:         60

Per-category (production escapes only):
  regression:    8
  integration:   6
  data:          2
  environment:   2

Prior window (March) — 105 defects total:
  found_in = production:  21
  found_in = staging:     38
  found_in = dev:         46

Both exports include discovered_at and closed_at timestamps. MTTD
computable from those.

Category map already applied via tracker labels — no unclassified bucket.

Release events from git log this window:
  v4.6.0 shipped 2026-04-03 — release-management workflow change
  (canary deploys + 24h bake).
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 uses tracker categories. Step 2 computes total 120
(prior 105, Δ +15, +14.3%); escape rate this month = 18/120 = 15.0%
(prior month 21/105 = 20.0%) → escape rate is **down -5pp** despite
total defects growing. Pareto on production escapes: regression (8/18 =
44.4%) + integration (6/18 = 33.3%) = 77.8% — those two categories
account for the bulk. MTTD is computed from the supplied timestamps
(report `n/a` if some rows are missing closed_at, but at least one
windowed mean is computable). Step 3 narrative explicitly separates
total defect growth (+14.3%) from escape-rate trajectory (down -5pp) —
the agent must NOT conflate them per the anti-pattern note ("conflating
escape rate with bug count growth — they are orthogonal; report
independently"). Step 4 citation appendix maps the escape rate to the
`found_in: production` filter on the export. Movers paragraph
correlates the escape-rate drop with the v4.6.0 canary-deploy workflow
change on 2026-04-03.

**Pass condition:** Output contains the substring `escape rate` AND
reports separate numeric values for total defects and escape rate
(both metrics emitted, not collapsed into one statement). Output does
NOT state that "defects went up" without also surfacing that escape
rate went down (per the anti-pattern, conflating the two is rejected).

## Eval 3 — adversarial — single window only (refuse to emit a trend)

**Input:**

```
Run the weekly defect review for 2026-W22 (2026-05-25..2026-05-31). We
just adopted the tracker — this is our first week with categorised data.

This window (2026-W22) — 33 defects total:
  regression:   12
  integration:   8
  environment:   5
  data:          4
  other:         4

No prior-window data exists. The tracker was empty before 2026-05-25.

The export does include found_in metadata. Production escapes this
window: 6.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per the Refuse-to-proceed rule "Emit a trend over <2
windows of comparable size. Without prior-window data, label the output
`snapshot, not trend`", the agent must label this output explicitly as
a snapshot. It still computes the Pareto distribution within the single
window (regression 36.4% + integration 24.2% + environment 15.2% =
75.8%, with data added 87.9%) and reports total 33 + escape rate (6/33
= 18.2%) for the snapshot. It does NOT compute WoW deltas, movers up /
down, or trailing averages — there is no prior window to compare
against. The narrative explicitly states this is a baseline snapshot,
not a trend, and that subsequent windows can be compared against it.
The 4-week trailing average mentioned in anti-patterns is also `n/a`
for the same reason. The agent does NOT fabricate "movers" against a
hypothetical prior week.

**Pass condition:** Output contains the literal string `snapshot, not
trend` (the agent's exact refuse-to-proceed label). Output does NOT
contain a WoW Δ% figure (no `+X% WoW` / `-X% WoW` style number).
Output does NOT contain a "Top-3 movers" table populated with
direction-of-change entries (the agent must not fabricate movers
without a prior window).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks with pre-counted
  category summaries — no external Linear / Jira / GitHub export
  fixture needed.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
