# WCAG 2.2 compliance report - full sample format

Deep reference for `wcag-compliance-reporter` SKILL.md. Consult when rendering
the whole multi-table report; SKILL.md Step 5 keeps only the top verdict table
and points here for the rest.

The complete report renders the executive verdict first, then process-coverage,
failures-by-SC, per-page-detail, and coverage-gap sections. The full template
(every section with example rows):

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
| account   | 3          | 3             | -                              |

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

### `/checkout/payment` - 12 violations across 5 SC

| SC    | Tool    | Selector                          | Message |
|-------|---------|-----------------------------------|---------|
| 1.4.3 | axe     | `.amount-due`                      | Foreground/background contrast 3.2:1 (need 4.5:1 for normal text) |
| 2.4.7 | axe     | `button.continue-payment`           | Element does not have a visible focus indicator |
| ...

(Full per-page tables follow.)

## Coverage gaps - automated tools don't cover everything

| SC level | Total SCs | Covered by ≥1 tool | Manual review required |
|----------|----------:|-------------------:|------------------------|
| A        |    25     |        15          |  10 SCs                |
| AA       |    24     |        17          |   7 SCs                |
| AAA      |    28     |        14          |  14 SCs                |

**Manual review SC list (excerpt):** 1.2.1 (Audio-only / Video-only),
2.2.2 (Pause / Stop / Hide), 3.1.5 (Reading Level), ... See
`docs/manual-checklist.md` for the per-SC checklist.
```

The verdict rows restate the binary per-level rule from
[wcag-conformance][wcag-conf] ("All success criteria at a claimed level must be
satisfied with no exceptions"): a failing level cannot claim conformance, and an
`unknown` level means the scan never covered the SCs that level's claim needs.

[wcag-conf]: https://www.w3.org/WAI/WCAG22/Understanding/conformance
