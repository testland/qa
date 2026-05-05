---
name: definition-of-done
description: Pure-reference + checklist-generator for the team's Definition of Done (DoD) — explains the Scrum Guide's DoD definition ("a formal description of the state of the Increment when it meets the quality measures required for the product"), proposes a starter DoD with the 7-10 lines most teams need (code reviewed, unit tests, docs, AC met, deployed to staging, smoke passed, no a11y regressions, telemetry wired, observability in place), and emits a per-PR checklist `quality-coach` enforces. Use when the team doesn't have a DoD or wants to revise theirs.
rating: 22
d6: 4
archetype: S2
---

# definition-of-done

## Overview

Per [scrum-guide][sg]:

[sg]: https://scrumguides.org/scrum-guide.html

> "The Definition of Done is a formal description of the state of
> the Increment when it meets the quality measures required for
> the product."

> "If your organization has established standards, all teams must
> follow them as the minimum requirement. Otherwise, the Scrum
> Team must create a Definition of Done appropriate for the
> product." ([scrum-guide][sg])

The DoD is the team's contract with itself. Without it, "done"
varies per PM / per developer / per sprint.

## When to use

- A new team needs to author its first DoD.
- An existing team's DoD is stale (years old; doesn't reflect
  current quality bar).
- A retro identified that "done" means different things to different
  team members.
- An audit / compliance review needs a documented quality bar.

## Starter DoD (recommended baseline)

Most teams converge on something like:

```markdown
# Definition of Done — `<team>`

A story / PR is "Done" only when ALL of the following are true:

1. **Code reviewed** by at least one other engineer; review approval
   recorded.
2. **Tests** for new behavior:
   - Unit test coverage on changed files >=80%.
   - At least one test per acceptance criterion.
3. **Documentation** updated:
   - User-facing changes have updated docs (or "no user-facing
     change" is documented).
   - API changes have updated OpenAPI / Swagger / type definitions.
4. **Acceptance criteria** from the story all pass (manual or
   automated; per AC ID).
5. **Deployed to staging** and smoke test passed (per
   [`smoke-suite-gate`](../smoke-suite-gate/SKILL.md)).
6. **No new accessibility regressions** (axe / pa11y / Lighthouse
   a11y category green vs main).
7. **Telemetry / observability** wired for new features (per
   [`synthetic-monitor-author`](../../qa-shift-right/skills/synthetic-monitor-author/SKILL.md)).
8. **Security review** for changes that touch auth / payments /
   PII — threat-model entry per
   [`threat-model-from-spec`](../../qa-shift-left/agents/threat-model-from-spec.md).
9. **No new tech debt** introduced without an issue logged.
10. **Build green** on the target branch (CI check required).
```

Customize per team — not all 10 apply to every project.

## Per-organization vs per-team

Per [scrum-guide][sg]:

> "If your organization has established standards, all teams must
> follow them as the minimum requirement."

If the org has a security review requirement, every team's DoD
includes it. The team's DoD can add stricter team-specific lines
on top, but can't drop org-wide minimums.

## Categorization of DoD lines

| Category    | Examples                                          | Verifier               |
|-------------|---------------------------------------------------|-----------------------|
| Code quality | Reviewed, no new lint errors                       | Code review tool       |
| Test coverage | Unit test for new behavior, coverage threshold   | CI coverage gate        |
| Documentation | User-facing docs, API spec updated                 | Manual review          |
| Spec compliance | All AC met                                        | Manual or automated AC tests |
| Deploy state | Staging deploy + smoke                              | CI deploy job           |
| Quality bar | A11y regression, perf budget                         | CI gate                 |
| Observability | Telemetry / monitoring wired                       | Manual review of diff   |
| Security    | Threat model entry for sensitive changes           | Manual review          |
| Process     | Issue logged, retro feedback recorded              | Manual                  |

The categorization helps when adding lines: "do we have a coverage
of the security category?"

## Generated per-PR checklist

The DoD becomes a PR template:

```markdown
<!-- .github/pull_request_template.md -->

## Description

(what changed and why)

## Definition of Done checklist

- [ ] Code reviewed by ≥1 engineer.
- [ ] Unit tests added for new behavior; coverage check passes.
- [ ] Documentation updated (or "no user-facing change" noted below).
- [ ] All AC from the story pass.
- [ ] Deployed to staging; smoke suite green.
- [ ] No new a11y regressions (axe report attached for UI changes).
- [ ] Telemetry / monitoring wired for new features.
- [ ] Security review for auth / payment / PII changes (link to threat model).

## Notes

(any DoD line marked N/A — explain)
```

[`quality-coach`](../../qa-roles/agents/quality-coach.md) reads
this template + the actual PR state and verifies each line.

## DoD evolution

The DoD should evolve with the team's quality bar:

- After an a11y incident → add the a11y line.
- After a security incident → add the threat-model line.
- After production-canary saved a regression → add the
  canary-passed line.

Don't lower the DoD without explicit retro discussion. Lowering
because "we kept failing the gate" usually means the team needs
better tooling, not a lower bar.

## Review cadence

| Cadence   | Trigger                                        |
|-----------|------------------------------------------------|
| Quarterly | Schedule a 30-min DoD review.                  |
| Post-incident | Add lines that would have prevented the incident. |
| New team member onboarding | Reread the DoD; pick up new perspective. |

## Anti-patterns

| Anti-pattern                                                       | Why it fails                                                              | Fix |
|--------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| No DoD                                                              | Per [scrum-guide][sg], the team must define one if not org-mandated.     | Adopt the starter (above). |
| 30-line DoD that nobody can satisfy per-PR                          | Team marks everything "N/A"; defeats the purpose.                        | Trim to 7-10 lines covering the highest-value gates. |
| DoD as aspirational, not enforced                                   | "We have a DoD but PRs ship without meeting it."                         | [`quality-coach`](../../qa-roles/agents/quality-coach.md) enforces; PRs blocked on unmet lines. |
| Per-PR DoD different from team's "done"                              | Drift; team can't tell what's done.                                      | One DoD; one PR template referencing it. |
| Lowering the DoD when it gets in the way                            | Quality bar erodes silently.                                             | Discuss in retro before lowering; document the reason. |
| DoD never updated after an incident                                  | Same incident class recurs.                                              | Post-incident DoD review (above cadence). |

## Limitations

- **Subjective per-team.** "What's good enough" varies; the DoD
  reflects the team's context, not a universal standard.
- **Coverage thresholds are arbitrary.** "≥80%" is convention; the
  right number depends on the codebase.
- **Some lines are unverifiable automatically** ("docs updated" needs
  human review). The DoD acknowledges these — `quality-coach`
  marks them "unverifiable" rather than auto-passing.

## References

- [sg][sg] — Scrum Guide DoD: "a formal description of the state
  of the Increment when it meets the quality measures required for
  the product"; team owns it (or follows org-mandated minimum);
  items not Done return to the Product Backlog.
- [`quality-coach`](../../qa-roles/agents/quality-coach.md) — agent
  that enforces the DoD per-PR.
- [`definition-of-done-checker`](../../qa-shift-left/agents/definition-of-done-checker.md)
  — sibling adversarial agent for the same purpose.
- [`smoke-suite-gate`](../smoke-suite-gate/SKILL.md) — CI gate
  that satisfies the "staging deploy + smoke passed" line.
