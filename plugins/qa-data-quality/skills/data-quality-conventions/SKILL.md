---
name: data-quality-conventions
description: "Reference catalog of data-quality conventions - when to choose dbt-tests vs Great Expectations vs Soda, column-level vs table-level coverage, severity tiering, SLA and freshness conventions, and common anti-patterns to avoid. Use when designing coverage for a new data product or auditing an existing one."
---

# data-quality-conventions

A reference catalog for **how** to design data-quality coverage. Pairs
with the engine-specific skills
(`dbt-testing`,
`great-expectations`,
`soda-checks`) - those tell you the **how**
of running checks; this tells you **which** checks and **where**.

## Engine selection

Use this matrix to pick an engine before authoring any checks. Mixing
engines is fine in a large platform - the `data-quality-gate`
skill exists precisely to reconcile their outputs.

| Use case                                              | Preferred engine | Why |
|-------------------------------------------------------|------------------|-----|
| Repo is a dbt project; assertions live next to models | dbt-tests        | Tests run as part of `dbt build`, share the project's adapter, and live in the same `schema.yml` as the column docs. |
| Python ELT, programmatic suite generation, runtime data connectors | Great Expectations | First-class Pandas / SQL / Spark batches; suites composable in Python. |
| YAML-only checks against a SQL warehouse, cross-team observability via Soda Cloud | Soda             | SodaCL is a focused DSL; no Python or dbt required. |
| Mix of warehouse + non-warehouse sources               | dbt + GX or Soda + GX | Use dbt or Soda for warehouse coverage; GX for non-warehouse (file uploads, Spark jobs, ad-hoc Pandas). |
| Brand-new project, no preference                       | dbt-tests if you already have dbt; otherwise Soda for YAML simplicity | Lowest cognitive overhead. |

**Anti-pattern:** running all three engines on the same dataset for the
same checks "for redundancy" - duplicate checks shift the failure cost
to humans triaging three CI signals for the same root cause.

## Column-level vs table-level coverage

Authoring tip: start at the **column level** for the keys and required
fields, then add **table-level** invariants. A reasonable starter set
for a new data product:

| Layer        | Check                                              | Justification |
|--------------|----------------------------------------------------|---------------|
| Column (PK)  | `not_null`, `unique`                                | Catches the largest classes of ingestion bugs. |
| Column (FK)  | `relationships` to the referenced table             | Catches out-of-order loads. |
| Column (enum)| `accepted_values` for low-cardinality strings       | Catches new states added upstream without coordination. |
| Column (numeric) | range / `between` for business-bounded columns  | Catches arithmetic errors and unit mismatches. |
| Column (date)| `not_null` on required timestamps                   | Catches dropped fields. |
| Table        | `row_count > 0` (and an upper bound if known)       | Catches catastrophic ingestion drop or runaway duplicate. |
| Table        | `freshness` on the load-time timestamp              | Catches "pipeline didn't run" - the most common silent failure. |

For numeric columns, prefer **business-bounded ranges** (e.g. discount
0 - 100 %) over **distribution-bounded ranges** (e.g. mean ± 3σ). Statistical
ranges drift with seasonality and produce false positives at scale; the
shop should treat distribution monitoring as a separate concern from
data-quality assertions.

## Severity tiering

Three tiers cover most needs:

| Tier        | Behavior on failure                                 | Use for |
|-------------|-----------------------------------------------------|---------|
| `error`     | Block the pipeline / CI                             | Invariants the business depends on (PK uniqueness, FK integrity, required fields). |
| `warn`      | Surface in the report, do not block                 | Distribution shifts, soft constraints, new unfamiliar checks during ramp-up. |
| `info`      | Log only, never alert                               | Coverage telemetry (e.g. "70 % of customer rows had `email` populated"). |

In dbt, severity comes from a `severity:` config block; in GX, from
suite-level metadata; in SodaCL, from `warn:` / `fail:` blocks for
schema and from the alert configuration syntax for other checks. Each
engine's specifics are in its SKILL.md.

**Anti-pattern:** every check at `error`. A pipeline that blocks on a
single distribution drift becomes "the check that always fails" within
a quarter; the team eventually disables the gate entirely. Reserve
`error` for invariants the business will actually halt to fix.

## Freshness and SLAs

A freshness check is the highest-leverage assertion in most pipelines - 
it catches the "pipeline didn't run" failure mode that no row-level
check can detect (because there are no rows to check).

Conventions:

- **One freshness check per pipeline output table**, on the latest
  load-time / processed-at column.
- The freshness threshold is **2× the expected cadence**. A daily
  pipeline gets `freshness < 2d`; an hourly pipeline gets `< 2h`.
  This avoids false alarms from a single late run while still catching
  a stuck pipeline.
- Freshness is `error`-severity by convention - a stuck pipeline blocks
  every downstream business decision, so a noisy alert is the right
  behavior.

## Naming and ownership

- **Names mirror the assertion.** `not_null_orders_email` (dbt-style) or
  `missing_count(email) = 0` (SodaCL) is self-documenting; `assertion_42`
  is not.
- **Every test has an owner.** dbt: a `meta:` block under the column or
  model with `owner: @team-handle`. GX: suite-level metadata. SodaCL:
  the dataset's `meta:` block. Failure routing uses these to send
  each failure to its owner.

## Common anti-patterns

| Anti-pattern                                     | Why it fails                                        | Fix |
|--------------------------------------------------|-----------------------------------------------------|-----|
| Hard-coded distributions ("revenue between $X and $Y") | Drifts with seasonality; ages out within months | Bound with a moving window or replace with a separate distribution-monitoring tool. |
| `not_null` on every column                       | Some columns are legitimately nullable; floods the failure list with non-actionable noise | Annotate nullable columns explicitly in `schema.yml` and skip the test. |
| One mega-check that asserts an entire row at once | Hard to triage; a single failure does not tell you which field broke | Split into one check per invariant; aggregate at the gate level via the `data-quality-gate`. |
| Reaching into upstream raw data inside a check    | Couples the assertion to source schema; breaks on every upstream rename | Test the curated model output, not the raw source. |
| Same check authored in dbt **and** GX **and** Soda | Three failure signals for one root cause; triage cost triples | Pick one engine per check; use the gate skill to unify cross-engine coverage. |
| Severity `error` on a freshly added check         | First false positive disables the gate by social convention | Land new checks at `warn` for two cycles, then promote once they're seen to be stable. |

## When to retire a check

A check is healthy when it fails roughly **once per quarter on a real
issue**. Two failure modes warrant retirement:

- **Always passing** - the check costs scan time and bugs in it go
  undetected; consider whether the invariant moved upstream and the
  check is now redundant.
- **Always failing on the same root cause** - the team has learned to
  ignore it; either fix the root cause or relax the threshold to a
  level that catches *new* regressions.
