# qa-team-management

QA people-and-org tier for QA managers and heads of quality: map team capability against ISTQB CTAL-TM v3.0 "Managing the Team", run the full skill-matrix-to-gap-analysis loop (evidence-backed matrix, gap classification, roadmap-ranked priorities, train-vs-hire recommendations), run the end-to-end structured hiring chain when a gap resolves to hiring, compute the weekly quality-status digest, and turn quality data into Minto-pyramid executive narratives.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [skill-matrix-author](skills/skill-matrix-author/SKILL.md) | Build a QA team skill matrix (members x competencies x evidence-backed proficiency), classify the gaps, rank them against the roadmap, and recommend a train-vs-hire closing move per gap, per ISTQB CTAL-TM v3.0 chapter 3. |
| Skill | [qa-hiring-kit](skills/qa-hiring-kit/SKILL.md) | End-to-end structured hiring for QA / SDET / test-lead / quality-manager roles per Levashina 2014 et al. - JD, ISTQB-aligned question bank, competency-anchored rubric, interviewer calibration, panel debrief, and the 30-60-90 onboarding plan, with per-stage deep references. |
| Skill | [exec-quality-narrative](skills/exec-quality-narrative/SKILL.md) | Turn computed quality data (digests, KPIs, DORA metrics, escape trends, OKR grades) into an answer-first executive / QBR narrative structured by the Minto Pyramid Principle with cited numbers. |
| Skill | [quality-status-digest](skills/quality-status-digest/SKILL.md) | Computes pass rate, escape defects, and flake debt into a red / amber / green per-team digest, then rolls those same rows into a portfolio heatmap with STABLE / WATCH / INVEST tags. |
| Agent | [qa-manager](agents/qa-manager.md) | Generates the weekly backward-looking RAG quality-status digest from CI run history (`gh run list`), the defect tracker, and flake-quarantine state, applying quality-status-digest's formulas and thresholds. |

The components compose as a management loop: the skill matrix measures today and converts matrix-plus-roadmap into training and hiring moves, the hiring kit executes the hiring move, the qa-manager agent computes the digest the quality-status-digest skill defines, and the exec narrative reports the outcomes upward.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-team-management@testland-qa
```

## Composition with the rest of the marketplace

- A capability gap that resolves to hiring hands off to [`qa-hiring-kit`](skills/qa-hiring-kit/SKILL.md); the matrix's competency vocabulary stays consistent with the kit's rubric reference.
- [`exec-quality-narrative`](skills/exec-quality-narrative/SKILL.md) consumes the [`qa-manager`](agents/qa-manager.md) single-team digest and [`quality-status-digest`](skills/quality-status-digest/SKILL.md)'s portfolio roll-up.
- The boundary with the execution plugins: this plugin computes, aggregates, and reports quality signals and manages the people who produce them; running tests, triaging defects, and fixing flakes belong to the specialized plugins (qa-flake-triage, qa-bug-repro, qa-test-reporting).
