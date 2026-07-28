# Worked example - QA team skill matrix fragment

A 5-person checkout team with the professional-competence columns filled: the 0 - 3 levels,
the evidence footnotes that lock any cell above level 1, and the team-need row that Step 5
turns into the gap analysis. `req.` is the level the team needs in at least N people, derived
in Step 5. The footnote-per-cell convention is what makes the matrix auditable - anyone can
challenge a 3 by reading its evidence.

```markdown
# QA team skill matrix - checkout team - 2026-06

Scale: 0 none / 1 aware / 2 practitioner / 3 coach. Cells above 1 cite evidence (footnote).

| Member | Test design | Exploratory | Playwright automation | API testing | Perf (k6) | Domain: payments |
|---|---|---|---|---|---|---|
| Anna (lead)  | 3 [^a1] | 2 [^a2] | 2 [^a3] | 2 [^a4] | 1 | 3 [^a5] |
| Boris        | 2 [^b1] | 1       | 3 [^b2] | 2 [^b3] | 0 | 1 |
| Chen         | 2 [^c1] | 3 [^c2] | 1       | 1       | 0 | 2 [^c3] |
| Dana         | 1       | 1       | 2 [^d1] | 3 [^d2] | 2 [^d3] | 1 |
| Emil (new)   | 1       | 2 [^e1] | 1       | 1       | 0 | 0 |
| **Team need (req. / have)** | 2 in 3+ / have 3 | 2 in 2+ / have 3 | 2 in 3+ / have 3 | 2 in 2+ / have 3 | 2 in 2+ / **have 1** | 2 in 2+ / have 2 |

[^a1]: Authored the 2026 checkout test strategy; ran the team's test-design workshop (2026-03).
[^b2]: Owns the Playwright harness; 14 of last 20 framework PRs; coached Dana through fixture refactor.
[^c2]: 31 charter-based sessions logged in 2026-Q1; found 2 of the quarter's 3 P1 escapes.
[^d3]: Built the k6 smoke profile for checkout; single person who has run a load test this year.
```

Reading it: performance testing (k6) is the one actionable row - a bus-factor gap, with Dana
alone at level 2 against a need of 2 people, and no capability gap anywhere else.
