---
name: wcag-compliance-reporter
description: "Builds a per-page WCAG 2.2 compliance score report by aggregating output from one or more accessibility scanners (axe-core / pa11y / lighthouse / WAVE / IBM Equal Access), pivoting violations by Success Criterion (1.4.3 contrast, 2.4.7 focus visible, etc.), grouping by conformance level (A / AA / AAA), reporting per-page coverage gaps explicitly (the \"this page wasn't scanned\" failure mode), and emitting both an executive summary and a per-page drill-down. Use after a multi-page accessibility scan - pa11y-ci, axe across a sitemap, lighthouse-batch - when the team needs a shareable conformance report rather than a per-page tool dump."
---

# wcag-compliance-reporter

## Overview

WCAG 2.2 has 77 success criteria (SC) split across three
conformance levels: 25 at A, 24 at AA, 28 at AAA
([wcag-spec][wcag-tr]) - for a total of 49 SC at the AA level (which
is the typical legal / contractual target in the US, EU, UK).

[wcag-tr]: https://www.w3.org/TR/WCAG22/

Per [wcag-conformance][wcag-conf]:

[wcag-conf]: https://www.w3.org/WAI/WCAG22/Understanding/conformance

> "**Level AA**: 'satisfies all the Level A and Level AA success
> criteria'"
>
> "All success criteria at a claimed level must be satisfied with no
> exceptions."

That binary verdict ("conforms or doesn't") makes per-tool output
("axe found 17 violations in 5 pages") hard to act on - the team
needs to know **which SC at which level on which page** is failing
the conformance claim.

This skill builds that report.

## When to use

- A multi-page scan has produced output from one or more of:
  axe-core (via `@axe-core/cli` or `axe-puppeteer`), pa11y (via
  `pa11y-ci`), Lighthouse (via `lighthouse-batch`), WAVE,
  IBM Equal Access.
- A stakeholder asks "are we WCAG 2.2 AA conformant?" and wants a
  document, not a CLI dump.
- The team is preparing an accessibility audit / VPAT / ACR.
- A PR introduces UI changes and the team needs a "before vs after"
  on conformance.

If only one tool is in use, the tool's native HTML report may
suffice; this skill is for **aggregation** across multiple tools or
multiple pages.

## How to use

1. **Gather scan output** from one or more scanners (axe-core, pa11y,
   Lighthouse, WAVE, IBM Equal Access) across every page in scope.
2. **Normalize per tool** into one SC-keyed `Violation` shape, mapping each
   tool's rule ID to the WCAG Success Criterion it covers (Step 1).
3. **Aggregate** the normalized violations by SC and by page (Step 2).
4. **Compute the conformance verdict per level** (A / AA / AAA): `conformant`,
   `non-conformant`, or `unknown` - where `unknown` means the scan never
   covered the SCs a claim at that level needs (Step 3).
5. **Check page coverage** against the `pages-to-scan.yaml` process spec and
   flag any page that wasn't scanned (Step 4).
6. **Render the report** - the executive verdict plus per-SC and per-page
   markdown (Step 5), then emit the machine-readable `compliance.json` and the
   CI job that produces it (Machine output and CI, below).

## Step 1 - Author normalizers per upstream tool

Each scanner has its own JSON shape. The first step is normalizing
to a single intermediate format keyed by SC:

```typescript
interface Violation {
  page: string;                       // URL or path
  successCriterion: string;           // e.g. "1.4.3"
  level: 'A' | 'AA' | 'AAA';
  ruleId: string;                     // tool-specific rule (e.g. axe "color-contrast")
  selector: string;                   // CSS selector of failing element
  message: string;
  helpUrl?: string;                   // tool's docs
  scanner: 'axe' | 'pa11y' | 'lighthouse' | 'wave' | 'equal-access';
}
```

Normalizer per tool maps tool-specific rule IDs to the SC they cover, and a
central `sc-mapping.json` holds rule-to-SC for every tool the report consumes.
The per-tool tag conventions (axe `tags`, pa11y codes, Lighthouse's internal
map), a worked `normalize_axe` example, and the `sc-mapping.json` shape live in
[references/tool-normalizers.md](references/tool-normalizers.md).

## Step 2 - Aggregate

```python
def aggregate(violations):
    by_sc = defaultdict(lambda: defaultdict(list))   # sc -> level -> [violation]
    by_page = defaultdict(list)                       # page -> [violation]
    pages = set()
    for v in violations:
        by_sc[v['successCriterion']][v['level']].append(v)
        by_page[v['page']].append(v)
        pages.add(v['page'])
    return {
        'by_sc': dict(by_sc),
        'by_page': dict(by_page),
        'pages': sorted(pages),
    }
```

## Step 3 - Conformance verdict per level

Per [wcag-conformance][wcag-conf], conformance is binary per level
("All success criteria at a claimed level must be satisfied with no
exceptions"). The verdict logic:

```python
def conformance(agg, level):
    """Returns 'conformant' | 'non-conformant' | 'unknown'.
    Unknown if the scan didn't cover the SCs needed to claim conformance."""
    failing_scs = [sc for sc, by_level in agg['by_sc'].items()
                       if any(v['level'] in level_set(level) for v in
                              [vv for lvl, vs in by_level.items() for vv in vs])]
    if failing_scs:
        return 'non-conformant', failing_scs
    # Did the scan actually cover all SCs needed for this level?
    expected_scs = SC_BY_LEVEL[level]   # ground-truth list per WCAG 2.2
    covered_scs  = set(agg['by_sc'].keys())  # only SCs at least one tool checks
    missing = expected_scs - covered_scs
    if missing:
        return 'unknown', sorted(missing)
    return 'conformant', []
```

`level_set('AA')` returns `{'A', 'AA'}` because AA "satisfies all the
Level A and Level AA success criteria" ([wcag-conformance][wcag-conf]).

The "unknown" verdict is critical - automated tools cover roughly
30% of WCAG SCs. A green automated scan ≠ AA conformance. The
report must surface what wasn't scanned.

## Step 4 - Per-page coverage gaps

Equally important: did every relevant page get scanned at all? A
checkout flow with a missing scan on the payment page can't claim
conformance per [wcag-conformance][wcag-conf]:

> "**Complete Processes**: When a page is part of a multi-step
> process, 'all web pages in the process conform at the specified
> level or better.'"

Author maintains a `pages-to-scan.yaml`:

```yaml
processes:
  checkout:
    pages:
      - /
      - /products
      - /cart
      - /checkout
      - /checkout/payment
      - /checkout/confirm
  account:
    pages:
      - /account/login
      - /account/profile
      - /account/orders
```

Compare scanned pages against the spec; flag missing ones in the
report.

## Step 5 - Render the report

Render the executive verdict first: a three-row table mapping each conformance
level to its verdict and the reason.

| Conformance level | Verdict | Reason |
|-------------------|---------|--------|
| A   | ❌ non-conformant | 3 SC failing on 7 pages |
| AA  | ❌ non-conformant | + 5 additional SC failing on 12 pages |
| AAA | ⚠ unknown | 14 of 28 AAA SC weren't checked by any scanner |

Below the verdict, the full report adds process-coverage, failures-by-SC,
per-page-detail, and coverage-gap sections - the coverage-gap table is where the
"automated tools cover ~30% of SCs, the rest is manual review" reality from
Step 3 lands. The complete multi-table sample report, every section with example
rows, lives in
[references/sample-report-format.md](references/sample-report-format.md).

## Machine output and CI

Once the markdown report renders, two operational blocks finish the pipeline: a
machine-readable `compliance.json` for downstream dashboards / ACR gates, and
the CI job that runs the scanners and aggregator on every push. Both templates
live in
[references/machine-output-and-ci.md](references/machine-output-and-ci.md).

## Anti-patterns

| Anti-pattern                                                                    | Why it fails                                                                       | Fix |
|---------------------------------------------------------------------------------|------------------------------------------------------------------------------------|-----|
| Reporting "0 axe violations" as "WCAG conformant"                               | Automated tools cover ~30% of SCs; the rest needs manual review.                  | Always include the "manual review required" section (Step 5). |
| Treating all violation severities equally                                        | A contrast issue on a button isn't equivalent to a missing alt on a decoration.   | Group by SC level (A vs AA vs AAA); within a level, count instances.|
| Aggregating across pages without page coverage spec                              | Missing pages don't show up; the team thinks they're covered.                     | Author `pages-to-scan.yaml`; report missing pages explicitly (Step 4). |
| Declaring conformance from a single-tool scan                                    | Each tool has different SC coverage; a clean axe run can hide pa11y-detectable issues. | Use 2+ tools; deduplicate by `(page, SC, selector)`. |
| Per-tool report dumps with no SC mapping                                         | Reviewer can't tell if tool-rule "color-contrast" maps to SC 1.4.3.              | Maintain `sc-mapping.json` (Step 1). |
| Reporting AAA verdict as a fail without context                                   | AAA is rarely the target; failing AAA isn't a failure for an AA-targeting team.  | Make the target level explicit; report the other levels as "informational". |
| Ignoring "unknown" verdict (treating uncovered SCs as covered)                    | False conformance claim; potential legal exposure.                                | Surface the unknown verdict in bold (Step 3); list the unscanned SCs. |

## Limitations

- **Automated scans don't replace manual review.** Roughly 30% of
  WCAG SCs are tool-detectable; the rest require human assessment
  (cognitive load, alternative text quality, color-only meaning,
  etc.).
- **No screen-reader reality check.** Tools find the absence of
  ARIA; they don't verify that the screen-reader narration is
  helpful. Pair with `screen-reader-test-author` from
  `qa-accessibility`.
- **Per-tool drift.** Rule catalogs evolve; new tool versions may
  add or remove SC coverage. Pin tool versions in CI; bump the SC
  mapping in lock-step.
- **VPAT / ACR is a different document.** This report informs the
  VPAT but isn't the VPAT itself - those documents have specific
  formats (Section 508, EN 301 549) that go beyond WCAG.

## References

- [wcag-tr][wcag-tr] - WCAG 2.2 specification: 77 SC across A / AA
  / AAA, four POUR principles, 13 guidelines.
- [wcag-conformance][wcag-conf] - WCAG 2.2 conformance requirements:
  binary per-level verdict, complete-processes rule, no-exceptions
  rule.
- `junit-xml-analysis` (in the qa-test-reporting plugin) - reporter
  for test execution (different domain, same PR-time
  reporting shape).
- The `axe-a11y` scanner umbrella (axe-core primary; pa11y, Lighthouse
  a11y, WAVE, and IBM Equal Access in its references/) - produces the
  upstream input this skill consumes.
- Per-tool normalizers + the `sc-mapping.json` shape (Step 1 deep dive):
  [references/tool-normalizers.md](references/tool-normalizers.md).
- The full multi-table sample report format (Step 5 deep dive):
  [references/sample-report-format.md](references/sample-report-format.md).
- Machine-readable `compliance.json` output + the CI aggregation job:
  [references/machine-output-and-ci.md](references/machine-output-and-ci.md).
