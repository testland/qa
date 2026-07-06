---
name: traceability-matrix-builder
description: "Build-an-X workflow that produces a requirements-to-tests traceability matrix from a TCM case repository + a requirements source (Jira / Linear / GitHub Issues). Walks the author through (1) extracting requirements with stable IDs, (2) extracting cases + their refs, (3) computing coverage (which requirements have at least one test, which tests verify which requirements, orphaned cases / orphaned requirements), (4) emitting a CSV / Markdown / HTML matrix, and (5) producing an executive summary (X% requirement coverage, Y orphans, Z over-tested). Use for compliance audits, sprint-end coverage reviews, and traceability defensibility in regulated industries."
---

# traceability-matrix-builder

## Overview

This workflow ingests requirements + cases from any combination of
the catalog's sources and emits a deployable matrix proving "every
requirement has at least one test, every test verifies at least
one requirement." Mandatory in regulated industries (IEC 62304,
DO-178C, ISO 26262, FDA-cleared software); useful elsewhere as a
coverage-gap detector.

Per ISO/IEC/IEEE 29119-3:2021 §6.3 "Traceability" and ISTQB
CTAL-TM syllabus on test conditions and coverage items (cite by
stable ID; texts behind iso.org / istqb.org paywall).

For canonical case fields see
[`test-case-anatomy-reference`](../test-case-anatomy-reference/SKILL.md).

## When to use

- Pre-release coverage audit ("which requirements lack tests?").
- Compliance documentation in regulated industries.
- Sprint-end coverage review.
- Backing the
  [`test-case-quality-critic`](../../agents/test-case-quality-critic.md)
  when it audits requirement-coverage gaps.

## Step 1 - Extract requirements

Inventory the source - Jira project, Linear team, GitHub
Issues label. Each requirement must have:

- **Stable ID** (e.g., `REQ-AUTH-001`, `ENG-1234`, `#42`)
- **Title** (one-sentence)
- **Status** (Active / Deprecated)

```python
# Jira example
def get_requirements_jira(project_key):
    jql = f'project = {project_key} AND issuetype = "User Story" AND status != Done'
    issues = jira_search(jql)
    return [
        {"id": i["key"], "title": i["fields"]["summary"],
         "status": i["fields"]["status"]["name"]}
        for i in issues
    ]
```

For Linear / GitHub Issues use the corresponding bug-workflow skill
([`linear-bug-workflow-runner`](../../../qa-defect-management/skills/linear-bug-workflow-runner/SKILL.md),
[`github-issues-bug-workflow`](../../../qa-defect-management/skills/github-issues-bug-workflow/SKILL.md))
adapted for requirement-type issues rather than bugs.

## Step 2 - Extract cases + refs

For each case in the TCM, harvest its identifier + the requirement
references stored in the `refs` / link / tags field:

```python
# Per platform
def get_cases_testrail(project_id):
    cases = []
    # Per testrail-case-management list_cases pattern
    for case in list_testrail_cases(project_id):
        refs = case.get("refs", "").split(",") if case.get("refs") else []
        cases.append({"id": f"C{case['id']}", "title": case["title"],
                      "refs": [r.strip() for r in refs if r.strip()]})
    return cases

def get_cases_xray(project_key):
    # Tests in Xray are Jira issues; links indicate requirement coverage
    tests = jira_search(f'project = {project_key} AND issuetype = Test')
    cases = []
    for t in tests:
        # Get linked requirement issues
        links = get_issue_links(t["key"])
        reqs = [l["outwardIssue"]["key"] for l in links
                if l.get("type", {}).get("name") in ("Tests", "TestedBy")]
        cases.append({"id": t["key"], "title": t["fields"]["summary"],
                      "refs": reqs})
    return cases
```

## Step 3 - Compute coverage

Three derived metrics:

```python
def coverage(requirements, cases):
    req_ids = {r["id"] for r in requirements}
    case_to_reqs = {c["id"]: set(c["refs"]) & req_ids for c in cases}
    reqs_to_cases = {r["id"]: [] for r in requirements}
    for c in cases:
        for r in c["refs"]:
            if r in reqs_to_cases:
                reqs_to_cases[r].append(c["id"])

    covered = {r for r, cs in reqs_to_cases.items() if cs}
    uncovered = req_ids - covered
    orphan_cases = {c["id"] for c in cases if not case_to_reqs[c["id"]]}
    over_tested = {r: len(cs) for r, cs in reqs_to_cases.items() if len(cs) > 5}

    return {
        "requirements_total": len(requirements),
        "requirements_covered": len(covered),
        "coverage_pct": len(covered) / len(requirements) * 100 if requirements else 0,
        "uncovered_requirements": sorted(uncovered),
        "orphan_cases": sorted(orphan_cases),
        "over_tested_requirements": over_tested,
        "matrix": reqs_to_cases,
    }
```

### Definitions

| Metric | Definition | Healthy value |
|---|---|---|
| Requirement coverage % | Requirements with ≥1 case / total requirements | 95-100% (regulated); 80%+ (non-regulated) |
| Orphan cases | Cases with zero requirement refs | <5% (some cases are exploratory / regression-only - legitimate) |
| Over-tested requirements | Requirements with >5 cases each | Audit - possible test bloat |
| Coverage depth | Average cases per requirement | 1.5 - 3 typical; <1 = gaps; >5 = bloat |

## Step 4 - Emit the matrix

### CSV format

```python
import csv

def write_matrix_csv(reqs_to_cases, requirements, path):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Requirement ID", "Requirement Title", "Test Case IDs", "Count"])
        for r in requirements:
            cs = reqs_to_cases.get(r["id"], [])
            w.writerow([r["id"], r["title"], "; ".join(cs), len(cs)])
```

### Markdown format

```markdown
# Traceability matrix — <project> — <date>

**Requirement coverage:** 87 / 92 (94.6%)
**Orphan cases:** 14
**Over-tested requirements:** 3

## Matrix

| Requirement ID | Title | Test cases | Count |
|---|---|---|---|
| REQ-AUTH-001 | User logs in with valid credentials | C1234, C1235, C1240 | 3 |
| REQ-AUTH-002 | Password reset flow | C1241 | 1 |
| REQ-AUTH-003 | OAuth login (Google) | — | **0 (UNCOVERED)** |
| REQ-CHECKOUT-001 | Apply promo code | C2001, C2002, C2003, C2004, C2005, C2006 | **6 (OVER-TESTED)** |

## Uncovered requirements

- REQ-AUTH-003 — OAuth login (Google)
- REQ-AUTH-005 — Magic-link login
- ...

## Orphan cases

- C9999 — "Exploratory: cart edge cases"
- C9888 — "Smoke check — homepage renders"
- ...
```

### HTML format (interactive)

For audit handoff, an interactive HTML version with filtering is
useful. Use a template (a generic Jinja approach) - out of scope
for this skill but composable with downstream rendering.

## Step 5 - Produce executive summary

```markdown
## Traceability summary — <project> — <YYYY-MM-DD>

### Headline

**87 of 92 requirements covered (94.6%)** — 5 gaps require action
before the v1.4 release.

### Gaps requiring action

| Requirement | Status | Recommended action |
|---|---|---|
| REQ-AUTH-003 OAuth login (Google) | Uncovered | Add manual + automated case before sprint end |
| REQ-AUTH-005 Magic-link login | Uncovered | Add automated case |
| REQ-AUTH-006 SAML login | Uncovered | Defer to v1.5 — feature behind flag |
| REQ-CHECKOUT-008 Refund flow | Uncovered | Manual test exists in Confluence — migrate to TCM |
| REQ-API-014 Rate limit response | Uncovered | Add API test |

### Possible bloat (over-tested)

| Requirement | Cases | Recommendation |
|---|---|---|
| REQ-CHECKOUT-001 Apply promo code | 6 cases | Audit for duplicates; aim for ≤3 |
| REQ-AUTH-001 User login | 3 cases | Acceptable spread |

### Orphan cases

14 cases have no requirement reference. Of these:
- 8 are intentional (regression / smoke / exploratory)
- 6 should be linked to existing requirements (REQ-CHECKOUT-*)

### Next steps

1. Add the 5 missing cases for action requirements (4 person-days).
2. Audit REQ-CHECKOUT-001 for redundancy (½ person-day).
3. Link the 6 mis-categorised orphans (½ person-day).
```

## Step 6 - Schedule + automation

Run the matrix-builder on a schedule:

```yaml
# .github/workflows/traceability.yml
on:
  schedule:
    - cron: '0 9 * * MON'  # weekly Monday 09:00
  workflow_dispatch:

jobs:
  build-matrix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: python scripts/build-matrix.py > matrix.md
      - run: |
          gh issue create --title "Traceability matrix — $(date +%Y-%m-%d)" \
                          --body-file matrix.md \
                          --label coverage-report
```

## Worked example

Project: `ENG`. 92 user-story requirements in Jira; 287 cases in
TestRail.

```python
reqs = get_requirements_jira("ENG")        # 92 requirements
cases = get_cases_testrail(project_id=42)  # 287 cases
cov = coverage(reqs, cases)
print(f"Coverage: {cov['coverage_pct']:.1f}%")
print(f"Uncovered: {cov['uncovered_requirements']}")
print(f"Orphans: {len(cov['orphan_cases'])}")
write_matrix_csv(cov["matrix"], reqs, "matrix.csv")
```

Output:

```
Coverage: 94.6%
Uncovered: ['REQ-AUTH-003', 'REQ-AUTH-005', 'REQ-AUTH-006',
            'REQ-CHECKOUT-008', 'REQ-API-014']
Orphans: 14
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One requirement = one test forever | Doesn't reflect risk; over-tested critical paths under-tested edges | Tier requirements; aim for 1+ test per req, more for critical/high-risk |
| Manual matrix in Excel | Diverges from reality the moment someone adds a test | Auto-generate from TCM + requirements source |
| Building matrix only for audits | Discovery delayed until too late | Run weekly; treat as a continuous metric |
| Counting orphan cases as "bad" | Some orphans are legitimate (smoke, exploratory) | Categorise: intentional orphan vs needs-linking |
| Counting linked-but-broken-link refs as covered | Stale `refs` to deleted requirements masquerade as coverage | Validate `refs` resolve in the requirements source |
| Bidirectional matrix collapsed to one direction | Loses visibility into over-tested vs under-tested | Always emit both directions |
| Reporting % only | Misses the actionable gap list | Always list the uncovered IDs |

## Limitations

- **Stale refs.** Free-text `refs` fields (TestRail, Qase tags)
  don't validate referent existence; the builder must verify
  against the requirements source.
- **Cross-source matrices.** When requirements live in Jira but
  cases in TestRail, the join is by free-text key. Discipline
  required.
- **Doesn't measure test quality.** Coverage % can be 100% with
  weak tests; pair with
  [`test-case-quality-critic`](../../agents/test-case-quality-critic.md).
- **Risk-weighting absent.** All requirements weighted equally;
  high-risk requirements may deserve deeper coverage. Pair with
  qa-process risk-matrix output to weight.
- **No mutation-testing input.** True coverage measurement combines
  requirement coverage with mutation testing
  ([`qa-mutation-testing`](../../../qa-mutation-testing/)); both
  needed.

## References

- ISO/IEC/IEEE 29119-3:2021 §6.3 "Traceability" - cite by stable
  ID.
- ISTQB CTAL-TM syllabus - coverage items, test conditions.
- IEC 62304 §5.5 (medical-device software traceability) - cite by
  stable ID.
- DO-178C §6.5 (avionics traceability) - cite by stable ID.
- Composes:
  [`test-case-anatomy-reference`](../test-case-anatomy-reference/SKILL.md),
  case-management skills for each platform.
- Audits via:
  [`test-case-quality-critic`](../../agents/test-case-quality-critic.md).
