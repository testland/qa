# qa-team-management

QA people-and-org tier for QA managers and heads of quality: map team capability against ISTQB CTAL-TM v3.0 "Managing the Team", run the full skill-matrix-to-gap-analysis loop (evidence-backed matrix, gap classification, roadmap-ranked priorities, train-vs-hire recommendations), and turn quality data into Minto-pyramid executive narratives.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [skill-matrix-author](skills/skill-matrix-author/SKILL.md) | Build a QA team skill matrix (members x competencies x evidence-backed proficiency), classify the gaps, rank them against the roadmap, and recommend a train-vs-hire closing move per gap, per ISTQB CTAL-TM v3.0 chapter 3. |
| Skill | [exec-quality-narrative](skills/exec-quality-narrative/SKILL.md) | Turn computed quality data (digests, KPIs, DORA metrics, escape trends, OKR grades) into an answer-first executive / QBR narrative structured by the Minto Pyramid Principle with cited numbers. |
| Skill | [quality-status-digest](skills/quality-status-digest/SKILL.md) | Computes pass rate, escape defects, and flake debt into a red / amber / green per-team digest, then rolls those same rows into a portfolio heatmap with STABLE / WATCH / INVEST tags. |

The components compose as a management loop: the skill matrix measures today and converts matrix-plus-roadmap into training and hiring moves, the digest computes the quality signals, and the exec narrative reports the outcomes upward.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-team-management@testland-qa
```

## Composition with the rest of the marketplace

- A capability gap that resolves to hiring hands off to [`qa-jd-author`](../qa-hiring/skills/qa-jd-author/SKILL.md) and the qa-hiring structured-interview chain; the matrix's competency vocabulary stays consistent with [`hiring-rubric-author`](../qa-hiring/skills/hiring-rubric-author/SKILL.md).
- [`exec-quality-narrative`](skills/exec-quality-narrative/SKILL.md) consumes the [`qa-manager`](../qa-roles/agents/qa-manager.md) single-team digest (qa-roles) and [`quality-status-digest`](skills/quality-status-digest/SKILL.md)'s portfolio roll-up.
- The boundary with qa-roles: qa-roles agents compute and aggregate quality signals; this plugin manages the people who produce them.
