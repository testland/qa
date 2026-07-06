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

Normalizer per tool maps tool-specific rule IDs to the SC they cover.
The mapping is curated upstream - axe ships `tags` like `wcag2a`,
`wcag143`; pa11y ships `WCAG2AA.Principle1.Guideline1_4.1_4_3`;
Lighthouse uses an internal mapping documented in its audit catalog.

```python
# scripts/normalize_axe.py
def normalize_axe(json_blob, page_url):
    out = []
    for violation in json_blob.get('violations', []):
        sc = sc_from_axe_tags(violation['tags'])  # e.g. "1.4.3"
        if not sc: continue
        for node in violation['nodes']:
            out.append({
                'page': page_url,
                'successCriterion': sc,
                'level': level_from_sc(sc),       # "1.4.3" → "AA"
                'ruleId': violation['id'],
                'selector': ' '.join(node['target']),
                'message': violation['help'],
                'helpUrl': violation['helpUrl'],
                'scanner': 'axe',
            })
    return out
```

A central `sc-mapping.json` file holds rule-to-SC for every tool
the report consumes. Update it when a tool's catalog changes.

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

```markdown
# WCAG 2.2 Compliance Report

**Generated:** 2026-05-05
**Site:** example.com
**Scope:** 22 pages across 4 processes
**Tools used:** axe-core 4.10.3, pa11y 8.1.0, Lighthouse 12.5.0

## Verdict

| Conformance level | Verdict | Reason |
|-------------------|---------|--------|
| A   | ❌ non-conformant | 3 SC failing on 7 pages |
| AA  | ❌ non-conformant | + 5 additional SC failing on 12 pages |
| AAA | ⚠ unknown | 14 of 28 AAA SC weren't checked by any scanner |

> Per [wcag-conformance][wcag-conf]: "All success criteria at a
> claimed level must be satisfied with no exceptions." Failing
> means the conformance claim cannot be made for this level.

## Process coverage

| Process   | Pages spec | Pages scanned | Missing                         |
|-----------|-----------:|--------------:|---------------------------------|
| checkout  | 6          | 5             | `/checkout/confirm` not scanned |
| account   | 3          | 3             | —                               |

⚠ Until `/checkout/confirm` is scanned, the **checkout process**
cannot claim conformance regardless of per-page results
([wcag-conformance][wcag-conf] "Complete Processes").

## Failures by Success Criterion (Level A + AA)

| SC      | Title                              | Level | Pages affected | Total instances |
|---------|------------------------------------|-------|---------------:|----------------:|
| 1.4.3   | Contrast (Minimum)                 | AA    |             7  |              23 |
| 2.4.7   | Focus Visible                      | AA    |             4  |               8 |
| 3.3.2   | Labels or Instructions             | A     |             3  |               5 |
| 4.1.2   | Name, Role, Value                  | A     |             6  |              14 |
| 1.1.1   | Non-text Content                   | A     |             2  |               4 |

(Click an SC for per-page detail.)

## Per-page detail (top failing pages)

### `/checkout/payment` — 12 violations across 5 SC

| SC    | Tool    | Selector                          | Message |
|-------|---------|-----------------------------------|---------|
| 1.4.3 | axe     | `.amount-due`                      | Foreground/background contrast 3.2:1 (need 4.5:1 for normal text) |
| 2.4.7 | axe     | `button.continue-payment`           | Element does not have a visible focus indicator |
| ...

(Full per-page tables follow.)

## Coverage gaps — automated tools don't cover everything

| SC level | Total SCs | Covered by ≥1 tool | Manual review required |
|----------|----------:|-------------------:|------------------------|
| A        |    25     |        15          |  10 SCs                |
| AA       |    24     |        17          |   7 SCs                |
| AAA      |    28     |        14          |  14 SCs                |

**Manual review SC list (excerpt):** 1.2.1 (Audio-only / Video-only),
2.2.2 (Pause / Stop / Hide), 3.1.5 (Reading Level), ... See
`docs/manual-checklist.md` for the per-SC checklist.
```

## Step 6 - Emit machine-readable output too

In addition to the markdown, emit `compliance.json` for downstream
consumption (dashboards, ASR, programmatic gates):

```json
{
  "generatedAt": "2026-05-05T14:00:00Z",
  "site": "example.com",
  "verdict": { "A": "non-conformant", "AA": "non-conformant", "AAA": "unknown" },
  "processes": [
    { "name": "checkout", "pagesSpec": [...], "pagesScanned": [...], "complete": false },
    { "name": "account", "pagesSpec": [...], "pagesScanned": [...], "complete": true }
  ],
  "violations": [...]
}
```

## Step 7 - CI integration

```yaml
- name: Run scanners
  run: |
    npx pa11y-ci   --json > pa11y.json
    npx @axe-core/cli https://staging.example.com > axe.json
    npx lighthouse-batch -s https://staging.example.com -o reports/

- name: Aggregate + report
  run: python scripts/wcag_compliance.py \
        --pa11y pa11y.json \
        --axe axe.json \
        --lighthouse reports/ \
        --pages-spec pages-to-scan.yaml \
        --out compliance/

- name: Upload
  uses: actions/upload-artifact@v4
  with:
    name: wcag-compliance
    path: compliance/
```

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
- [`junit-xml-analysis`](../../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md) - sibling
  reporter for test execution (different domain, same PR-time
  reporting shape).
- The `qa-accessibility` plugin's per-tool wrappers
  (`axe-a11y`, `pa11y-a11y`, `lighthouse-a11y`, `wave-a11y`,
  `ibm-equal-access-a11y`) - produce the upstream input this skill
  consumes.
