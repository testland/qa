# qa-team-management

QA people-and-org tier for QA managers and heads of quality: map team capability against ISTQB CTAL-TM v3.0 "Managing the Team", design IC and management career ladders, run GROW-model 1:1s, write SBI evidence-based feedback, and turn quality data into Minto-pyramid executive narratives.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [skill-matrix-author](skills/skill-matrix-author/SKILL.md) | Build a QA team skill matrix (members x competencies x evidence-backed proficiency) and derive a gap analysis against the team's required testing skills, per ISTQB CTAL-TM v3.0 chapter 3. |
| Skill | [career-ladder-author](skills/career-ladder-author/SKILL.md) | Design a QA career ladder - parallel IC and management tracks, per-level criteria on constant axes, observable promotion evidence, and the anti-patterns (tenure promotion, management-only ceiling) named per level. |
| Skill | [tester-one-on-one-planner](skills/tester-one-on-one-planner/SKILL.md) | Build recurring 1:1 agendas with a protected status-vs-growth split and a GROW-model (Goal / Reality / Options / Will) coaching-question bank seeded from each tester's skill-matrix row. |
| Skill | [performance-feedback-author](skills/performance-feedback-author/SKILL.md) | Draft evidence-based feedback and review input using CCL's SBI(I) model, with every Behavior statement pulled from work artifacts (bug reports, test code, review comments) rather than impressions. |
| Skill | [exec-quality-narrative](skills/exec-quality-narrative/SKILL.md) | Turn computed quality data (digests, KPIs, DORA metrics, escape trends, OKR grades) into an answer-first executive / QBR narrative structured by the Minto Pyramid Principle with cited numbers. |
| Skill | [quality-status-digest](skills/quality-status-digest/SKILL.md) | Computes pass rate, escape defects, and flake debt into a red / amber / green per-team digest, then rolls those same rows into a portfolio heatmap with STABLE / WATCH / INVEST tags. |
| Agent | [team-capability-gap-analyst](agents/team-capability-gap-analyst.md) | Reads a completed skill matrix plus the upcoming roadmap and emits a prioritized capability-gap report with a train-vs-hire recommendation per gap; refuses self-assessment-only matrices. |

The components compose as a management loop: the skill matrix measures today, the ladder defines progression, 1:1s and feedback move individuals, the gap analyst converts matrix-plus-roadmap into training and hiring moves, and the exec narrative reports the outcomes upward.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-team-management@testland-qa
```

## Composition with the rest of the marketplace

- A capability gap that resolves to hiring hands off to [`qa-jd-author`](../qa-hiring/skills/qa-jd-author/SKILL.md) and the qa-hiring structured-interview chain; the matrix's competency vocabulary stays consistent with [`hiring-rubric-author`](../qa-hiring/skills/hiring-rubric-author/SKILL.md).
- [`exec-quality-narrative`](skills/exec-quality-narrative/SKILL.md) consumes the [`qa-manager`](../qa-roles/agents/qa-manager.md) single-team digest and the [`head-of-quality`](../qa-roles/agents/head-of-quality.md) portfolio review (qa-roles), and points forward to [`qa-okr-author`](../qa-process/skills/qa-okr-author/SKILL.md) (qa-process) for next-quarter commitments.
- The boundary with qa-roles: qa-roles agents compute and aggregate quality signals; this plugin manages the people who produce them.
