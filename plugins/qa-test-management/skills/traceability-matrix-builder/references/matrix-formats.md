# Traceability matrix output formats

Full Markdown and HTML matrix templates, the filled executive-summary mockup,
and an end-to-end worked example. The CSV writer and the executive-summary
skeleton stay inline in SKILL.md; these are the longer illustrative variants
rendered from the same `reqs_to_cases` structure.

## Markdown format

    # Traceability matrix - <project> - <date>

    **Requirement coverage:** 87 / 92 (94.6%)
    **Orphan cases:** 14
    **Over-tested requirements:** 3

    ## Matrix

    | Requirement ID | Title | Test cases | Count |
    |---|---|---|---|
    | REQ-AUTH-001 | User logs in with valid credentials | C1234, C1235, C1240 | 3 |
    | REQ-AUTH-002 | Password reset flow | C1241 | 1 |
    | REQ-AUTH-003 | OAuth login (Google) | - | **0 (UNCOVERED)** |
    | REQ-CHECKOUT-001 | Apply promo code | C2001, C2002, C2003, C2004, C2005, C2006 | **6 (OVER-TESTED)** |

    ## Uncovered requirements

    - REQ-AUTH-003 - OAuth login (Google)
    - REQ-AUTH-005 - Magic-link login

    ## Orphan cases

    - C9999 - "Exploratory: cart edge cases"
    - C9888 - "Smoke check - homepage renders"

## HTML format (interactive)

For audit handoff, an interactive HTML version with filtering is useful. Use a
template (a generic Jinja approach) - out of scope for this skill but composable
with downstream rendering.

## Executive-summary mockup (filled)

    ## Traceability summary - <project> - <YYYY-MM-DD>

    ### Headline

    **87 of 92 requirements covered (94.6%)** - 5 gaps require action before the
    v1.4 release.

    ### Gaps requiring action

    | Requirement | Status | Recommended action |
    |---|---|---|
    | REQ-AUTH-003 OAuth login (Google) | Uncovered | Add manual + automated case before sprint end |
    | REQ-AUTH-005 Magic-link login | Uncovered | Add automated case |
    | REQ-AUTH-006 SAML login | Uncovered | Defer to v1.5 - feature behind flag |
    | REQ-CHECKOUT-008 Refund flow | Uncovered | Manual test exists in Confluence - migrate to TCM |
    | REQ-API-014 Rate limit response | Uncovered | Add API test |

    ### Possible bloat (over-tested)

    | Requirement | Cases | Recommendation |
    |---|---|---|
    | REQ-CHECKOUT-001 Apply promo code | 6 cases | Audit for duplicates; aim for 3 or fewer |
    | REQ-AUTH-001 User login | 3 cases | Acceptable spread |

    ### Orphan cases

    14 cases have no requirement reference. Of these:
    - 8 are intentional (regression / smoke / exploratory)
    - 6 should be linked to existing requirements (REQ-CHECKOUT-*)

    ### Next steps

    1. Add the 5 missing cases for action requirements (4 person-days).
    2. Audit REQ-CHECKOUT-001 for redundancy (half a person-day).
    3. Link the 6 mis-categorised orphans (half a person-day).

## Worked example

Project `ENG`: 92 user-story requirements in Jira; 287 cases in TestRail.

    reqs = get_requirements_jira("ENG")        # 92 requirements
    cases = get_cases_testrail(project_id=42)  # 287 cases
    cov = coverage(reqs, cases)
    print(f"Coverage: {cov['coverage_pct']:.1f}%")
    print(f"Uncovered: {cov['uncovered_requirements']}")
    print(f"Orphans: {len(cov['orphan_cases'])}")
    write_matrix_csv(cov["matrix"], reqs, "matrix.csv")

Output:

    Coverage: 94.6%
    Uncovered: ['REQ-AUTH-003', 'REQ-AUTH-005', 'REQ-AUTH-006',
                'REQ-CHECKOUT-008', 'REQ-API-014']
    Orphans: 14
