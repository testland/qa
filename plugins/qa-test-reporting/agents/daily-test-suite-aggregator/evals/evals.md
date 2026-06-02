---
component: daily-test-suite-aggregator
type: agent
archetype: A2
---

# daily-test-suite-aggregator - evals

Companion eval cases for [`daily-test-suite-aggregator`](../../daily-test-suite-aggregator.md).
Three cases cover happy path / branch / adversarial: a `last-24h` roll-up
across three suites and three environments (cell matrix + concerns), a
`last-7d` roll-up with the same inventory (different window shape), and a
refusal when no inventory file is supplied.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates recorded below are
the eval-authoring date.

## Eval 1 - happy path - `last-24h` cell matrix with one FAIL cell

**Input:**

```
Inventory file (.testland-qa/aggregator.yml):

window: last-24h
environments: [dev, staging, prod-canary]
suites:
  unit-js:        { glob: "ci-artifacts/unit-js/**/junit.xml",        kind: junit-xml }
  contract:       { glob: "ci-artifacts/contract/**/pact-results.xml",kind: junit-xml }
  e2e-playwright: { glob: "ci-artifacts/e2e/**/test-results/",        kind: allure }
slos:
  unit-js:        { pass_rate: 1.00, max_duration_min: 10 }
  contract:       { pass_rate: 1.00 }
  e2e-playwright: { pass_rate: 0.98, max_duration_min: 90, max_new_flakes: 2 }

Yesterday baseline available for every cell.

Pre-parsed artifact summary (the agent ingests these via its preloaded
parsers — given here so the eval is deterministic):

  unit-js × dev          : 3121 / 3121 pass, 4 m 12 s
  unit-js × staging      : not configured
  unit-js × prod-canary  : not configured
  contract × dev         : 87 / 87 pass
  contract × staging     : 87 / 87 pass
  contract × prod-canary : 85 / 87 pass — 2 schema-drift failures
  e2e-playwright × dev   : 412 / 412 pass, 28 min
  e2e-playwright × staging : 410 / 412 pass — 1 new flake vs yesterday
  e2e-playwright × prod-canary : 401 / 412 pass — 11 fail (4 new since
                                  yesterday), 62 min

Task: emit the daily roll-up for 2026-05-26 UTC.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Step 3 emits the fixed-shape output: header
`# Daily test-suite roll-up — 2026-05-26 (window: last-24h, UTC)`,
a headline counting cells (the `e2e-playwright × prod-canary` cell
is FAIL because 97.3% < 98.0% SLO), a `## Cell matrix` table with
9 cells (3 suites × 3 environments) showing `not-configured` for
the two unit-js × non-dev cells, and a `## Cells of concern`
section that lists at minimum the prod-canary E2E FAIL with the
hand-off to `failure-classifier` and the contract WARN with the
hand-off to `contract-drift-investigator`.

**Pass condition:** Output contains the literal string
`# Daily test-suite roll-up — 2026-05-26` AND `Cell matrix` AND
`Cells of concern` AND `failure-classifier` AND
`contract-drift-investigator`. Output also contains at least one
of `97.3%` / `97.3` (the prod-canary E2E pass rate that drives
the FAIL verdict).

## Eval 2 - branch - `last-7d` window over the same inventory

**Input:**

```
Inventory file (.testland-qa/aggregator.yml):

window: last-7d
environments: [dev, staging, prod-canary]
suites:
  unit-js:        { glob: "ci-artifacts/unit-js/**/junit.xml",        kind: junit-xml }
  contract:       { glob: "ci-artifacts/contract/**/pact-results.xml",kind: junit-xml }
  e2e-playwright: { glob: "ci-artifacts/e2e/**/test-results/",        kind: allure }
slos:
  unit-js:        { pass_rate: 1.00, max_duration_min: 10 }
  e2e-playwright: { pass_rate: 0.98 }

Pre-parsed 7-day summary:

  unit-js × dev          : 7 runs, 21847 / 21847 pass
  contract × dev         : 7 runs, 609 / 609 pass
  contract × staging     : 7 runs, 609 / 609 pass
  contract × prod-canary : 7 runs, 605 / 609 pass — 4 schema-drift across 2 days
  e2e-playwright × dev   : 7 runs, 2884 / 2884 pass
  e2e-playwright × staging : 6 runs (Wednesday cron failed; cell is
                              not-run that day), 2470 / 2472 pass
  e2e-playwright × prod-canary : 7 runs, 2870 / 2884 pass — 14 fail

Yesterday baseline available; 7-day prior baseline is NOT available
(only 7 days of data total).

Task: emit the daily roll-up for 2026-05-26 UTC using the last-7d window.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Output uses the `last-7d` window in the header.
`e2e-playwright × staging` is reported as a partial-week with
`not-run` surfaced for the Wednesday cron gap (per the "Drop
`not-run` cells silently" refusal). The Δ-vs-yesterday section
emits `n/a (no prior data)` for cells whose 7-day prior baseline
is missing - the agent does NOT fabricate a Δ. `## Cells of
concern` lists the prod-canary cells.

**Pass condition:** Output contains the literal string
`last-7d` AND `not-run` AND `n/a` (in the Δ column for missing
baselines). Output does NOT contain `last-24h` in the report
header (that would mean the agent ignored the window override).

## Eval 3 - adversarial - no inventory file (refuse)

**Input:**

```
We don't have an inventory file yet — can you just figure out what suites
we ran yesterday from the artifacts in ci-artifacts/ and emit the roll-up?
We'll write the YAML later. Window: last-24h. Environments: just infer
them from the directory names.
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to emit a roll-up. Cites the documented
Refuse-to-proceed rule: "Emit a roll-up without an inventory file.
The (suite × environment) matrix is the load-bearing structure;
without the inventory, the report is shaped by whatever artifacts
happened to exist." Asks the user to author `.testland-qa/aggregator.yml`
with at minimum `window`, `environments`, and `suites` keys.
Does NOT emit a `# Daily test-suite roll-up` block, does NOT emit a
cell matrix.

**Pass condition:** Output contains at least one of `refuse` /
`Refuse` / `cannot proceed` / `will not` / `inventory` AND mentions
at least one of `aggregator.yml` / `.testland-qa/aggregator.yml` /
`inventory file`. Output does NOT contain
`# Daily test-suite roll-up` (the agent must not emit the
fixed-shape report header without an inventory).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (inventory YAML
  + pre-parsed artifact summaries). No need to materialise real CI
  artifacts - the eval supplies the summary the parsers would have
  produced, so re-runs grade only the aggregation + report logic.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Glob`, `Grep`,
  `Bash(jq *)` / `Bash(xmllint *)` / `Bash(find *)`) is read-only - 
  eval re-runs cannot modify the artifact tree or source.
- Eval cases were authored 2026-05-26 against the v3.0 / v4.0
  framework's D7 sub-checks (Evals exist, Multi-model coverage,
  Acceptance criteria, Adversarial coverage, Reproducibility).
