# Risk coverage output templates

Deep reference for the `risk-coverage-mapper` SKILL.md. The two reusable output formats the workflow emits - the per-risk coverage matrix (Step 4) and the executive summary (Step 6). Copy these skeletons; the worked example in SKILL.md shows them filled for one release.

## Coverage matrix (Step 4)

One row per risk, ordered by score descending. An orphan risk (depth 0) is bolded and repeated in its own section so it cannot be missed.

```markdown
# Risk coverage matrix - <release / quarter> - YYYY-MM-DD

**Total risks (score >= 5):** <n>
**Covered:** <n> (<%>)
**Orphan risks (no coverage):** <n> - <critical count> critical, <low count> low
**Average coverage depth:** <x.x>

## Risks by coverage

| Risk ID | Risk | Score | Automated tests | Manual cases | Monitors | Depth |
|---|---|---:|---|---|---|---:|
| <ID> | <title> | <score> | <test paths> | <case IDs> | <monitor IDs> | <n> |
| **<ID>** | **<title>** | **<score>** | ** - (ORPHAN)** | - | - | **0** |

## Orphan risks (critical action)

| Risk ID | Risk | Score | Why orphan |
|---|---|---:|---|
| <ID> | <title> | <score> | <reason: new risk, infra missing, ...> |

## Over-covered risks (audit)

| Risk ID | Risk | Depth |
|---|---|---:|
| <ID> | <title> | <depth 5+> |
```

## Executive summary (Step 6)

The stakeholder-facing rollup: a one-line headline, then the critical orphans (each with a recommended action, owner, and estimate), the audit list, and a coverage-debt trend table.

```markdown
## Risk-coverage executive summary - <quarter>

### Headline
<n> of <n> medium-or-higher risks covered (<%>). <n> orphan risks require action before release.

### Critical orphans (must address before release)
- **<ID>** (score <n>): <title>. Recommended action: <tests/monitors> (<estimate>, owner <name>).

### Possibly over-covered (audit)
- **<ID>** (depth <n>): <title>. Audit the sprint for redundancy.

### Coverage debt trend
| Month | Orphan risks | Avg depth |
|---|---:|---:|
| <YYYY-MM> | <n> | <x.x> |
```

Keep both artifacts version-controlled next to the matrix, so the trend table is real history rather than a re-estimate each cycle.
