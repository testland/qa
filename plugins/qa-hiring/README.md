# qa-hiring

QA hiring toolkit: a structured-interview triple - questions, rubric, calibration guide - for QA / SDET / test-lead / quality-manager roles. Implements the canonical Levashina 2014 *et al.* structured-interview methodology with ISTQB-aligned competency vocabulary.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [interview-question-author](skills/interview-question-author/SKILL.md) | Build a role + seniority-specific question bank - technical, behavioural (STAR-format), scenario-based, system-design - classified by ISTQB competency and Bloom's-taxonomy difficulty. |
| Skill | [hiring-rubric-author](skills/hiring-rubric-author/SKILL.md) | Build a competency-anchored 4-level scoring rubric (no-hire / borderline / hire / strong-hire) with concrete behavioural anchors per competency dimension. |
| Skill | [calibration-guide-author](skills/calibration-guide-author/SKILL.md) | Build an interviewer calibration guide - gold-standard model answers per question per score level, common interviewer pitfalls, and a panel-calibration session script. |

The three skills compose: questions are authored first, then the matching rubric, then the calibration guide. None of the three is sufficient alone - running structured interviews requires all three.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-hiring@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.

## Composition with the rest of the marketplace

- The `quality-manager` role's rubric leans on [`risk-matrix-recommender`](../qa-process/agents/risk-matrix-recommender.md)'s "decision-support with traceability" framing for the risk-prioritisation competency.
- The `qa-automation-engineer` and `sdet` roles' rubrics anchor on [`test-code-conventions`](../qa-test-review/skills/test-code-conventions/SKILL.md) for the test-code-quality dimension.
- The `manual-qa-engineer` role's rubric anchors on [`bug-report-template`](../qa-bug-repro/skills/bug-report-template/SKILL.md) and [`exploratory-charter-author`](../qa-manual-testing/agents/exploratory-charter-author.md) for the defect-lifecycle and exploratory-testing dimensions.

These cross-references keep hiring rubrics anchored on the same conventions the team already uses for execution.
