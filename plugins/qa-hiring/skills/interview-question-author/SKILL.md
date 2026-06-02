---
name: interview-question-author
description: "Build-an-X workflow that produces a QA-role-specific interview question bank - takes a role description (manual QA / SDET / automation engineer / test lead / quality manager) plus competency model and emits a structured question bank covering technical, behavioral (STAR-format), scenario-based, and system-design dimensions, classified by ISTQB-canonical competency areas and Bloom's taxonomy difficulty levels. Distinct from `hiring-rubric-author` (sibling skill that produces the scoring rubric) and `calibration-guide-author` (sibling that produces the gold-standard answer guide). Use as the first artifact a hiring manager produces when opening a QA / test role, before scheduling the first interview."
rating: 23
d6: 4
archetype: S3
---

# interview-question-author

## Overview

Hiring for QA roles is calibration-heavy: the same question scored by two interviewers without a rubric produces high noise (well-documented in [structured-interview research](https://en.wikipedia.org/wiki/Structured_interview)). The remedy is a **structured interview** - same questions, same order, same scoring rubric across candidates. This skill produces the *questions* half of that pair; the rubric and calibration guide are sibling skills in this plugin.

The skill is QA-specific by design. Generic interview-question generators exist in the wider AI tooling space; the differentiation here is (a) ISTQB-aligned competency framing, (b) role-specific question depth (manual QA vs SDET vs test lead require different technical / behavioral mixes), (c) STAR-format anchoring on behavioral questions per the canonical [STAR method](https://en.wikipedia.org/wiki/Situation,_task,_action,_result), and (d) a structured output ready to drop into a hiring loop.

## When to use

- A new QA / SDET / test-lead / quality-manager req has been opened and the team needs a question bank before scheduling interviews.
- An existing question bank is stale and the team is recalibrating after a hiring round.
- A team is moving from unstructured interviews to structured ones (the validity uplift is the published reason - see [Levashina et al. 2014, *Personnel Psychology*](https://en.wikipedia.org/wiki/Structured_interview)).

Do **not** use this skill to:

- Produce the scoring rubric - that is [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md).
- Produce the calibration guide / gold-standard answers - that is [`calibration-guide-author`](../calibration-guide-author/SKILL.md).
- Author non-QA-role questions (general engineering, product, design). The skill is QA-scoped.

## Step 1 - Capture the role inputs

Required inputs:

| Input | Notes |
|---|---|
| **Role title** | One of: `manual-qa-engineer`, `qa-automation-engineer`, `sdet`, `test-lead`, `quality-manager`. Each has different default depth weights (Step 3). |
| **Seniority** | One of: `junior`, `mid`, `senior`, `staff+`. Drives Bloom's-taxonomy difficulty mix in Step 4. |
| **Domain context** | The product area / regulated industry (e.g., "fintech payments", "healthcare EHR", "consumer mobile") - drives scenario-based questions. |
| **Required competencies** | Optional; if absent, the skill defaults to ISTQB Foundation Level chapters relevant to the role (test design, test management, test process, defect management, tools). |
| **Forbidden topics** | Optional; topics already covered elsewhere in the loop or out-of-scope for legal / compliance reasons. |

If the role title is not one of the five recognised QA roles, the skill halts with `UNRECOGNISED_ROLE — supply role from the recognised list, or run with role=qa-generic to use a flat default mix`.

## Step 2 - Allocate question slots

A typical 60-minute interview holds 6 - 8 questions. The skill defaults to a six-question shape. The mix shifts per role:

| Role | Technical depth | Behavioral (STAR) | Scenario-based | System / framework design |
|---|---|---|---|---|
| **manual-qa-engineer** | 2 | 2 | 2 | 0 |
| **qa-automation-engineer** | 3 | 1 | 1 | 1 |
| **sdet** | 2 | 1 | 1 | 2 |
| **test-lead** | 1 | 3 | 1 | 1 |
| **quality-manager** | 0 | 4 | 1 | 1 |

The mix is configurable; the table is the default. Behavioral count grows with seniority and people-leadership scope per the structured-interview research; technical depth grows with hands-on coding scope.

## Step 3 - Author per-slot questions

For each slot, the skill emits one question with the metadata reviewers need:

```markdown
### Q3 — Behavioral (STAR) | Senior | Bloom: K3 (Apply)

**Question:** Tell me about a release where you caught a critical defect late — after the test cycle but before production. Walk me through the situation, what your role was, what you did, and what the team learned.

**ISTQB competency:** Defect management (defect → failure distinction, escape-defect lifecycle).
**STAR cues:** Listen for: (S) the release context, (T) the candidate's specific responsibility, (A) the diagnostic and communication actions taken, (R) measurable outcomes + retro learnings.
**Time budget:** 8 min.
**Follow-up probes** (use only if the answer is shallow):
- "Was the defect found through automated tests, manual exploration, or a customer report?"
- "What changed in your team's process after this incident?"
- "How did you handle the stakeholder communication?"
```

Each question carries:
- **Type**: technical / behavioral / scenario / system-design.
- **Seniority anchor**: which level the question is calibrated for; senior questions remain useful at staff+ but with deeper probes.
- **Bloom's level (K1 - K4)**: K1 (remember) for fundamentals, K2 (understand) for explanation, K3 (apply) for situational execution, K4 (analyse) for synthesis. Bloom's levels are used by ISTQB to anchor question difficulty across the Foundation Level syllabus.
- **ISTQB competency** the question maps to (cite by stable ID; the [ISTQB Foundation Level v4.0 syllabus](https://www.istqb.org/certifications/certified-tester-foundation-level) is the canonical competency reference, though its specific URL drift means cite by syllabus version).
- **STAR cues** (for behavioral questions only) - per the [STAR method](https://en.wikipedia.org/wiki/Situation,_task,_action,_result), the interviewer listens for all four components; missing components prompt follow-up probes.
- **Time budget** in minutes.
- **Follow-up probes** - pre-authored so different interviewers don't drift into ad-hoc probing (the dominant source of interview noise per structured-interview research).

## Step 4 - Tune the difficulty distribution

Bloom's taxonomy mix per seniority (default; configurable):

| Seniority | K1 | K2 | K3 | K4 |
|---|---|---|---|---|
| junior | 30% | 40% | 25% | 5% |
| mid | 15% | 35% | 35% | 15% |
| senior | 5% | 25% | 40% | 30% |
| staff+ | 0% | 15% | 35% | 50% |

The skill flags questions whose Bloom's level is too far from the role's centre of gravity (e.g., a K1 fundamental question for a staff+ candidate is wasted slot).

## Step 5 - Emit the bank

The output is a single markdown document with:

1. **Header**: role, seniority, domain, total slots, mix summary.
2. **Question slots 1 - N**: per the format in Step 3.
3. **Reading list for the candidate** (optional): canonical references the candidate can prepare against - ISTQB Foundation Level syllabus, the team's testing handbook, etc. Always optional; avoid if the role advertises "no prep needed".
4. **Hand-off block**:

```markdown
## HAND-OFF — required next steps

1. Pair with `hiring-rubric-author` to produce the per-question scoring rubric. The rubric and the questions must travel together; otherwise the loop reverts to unstructured.
2. Pair with `calibration-guide-author` after the rubric exists; the calibration guide is what brings interviewer scoring into agreement.
3. Lock the question bank at the start of the hiring round; if the bank changes mid-round, every prior candidate's score is no longer comparable.
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Generic behavioral questions ("Tell me about a time you faced a challenge") | Drains the slot; the answer is unscorable because the question lacks specificity. | Behavioral questions must name the QA-specific context (release, defect, framework, regulation). |
| Asking the same question across all seniority levels | The signal is wasted - a K1 fundamentals question reveals nothing about a staff+ candidate. | Step 4 difficulty tuning per seniority. |
| Including a question already covered in the take-home / coding screen | Double-coverage at the cost of a slot. | The `forbidden topics` input excludes those areas. |
| Including "puzzle" questions ("estimate the number of QA engineers in your city") | Validity is documented to be near zero per structured-interview meta-analyses; the question signals interviewer preference, not candidate competence. | The skill refuses to emit Fermi / puzzle questions. Cite [structured-interview research](https://en.wikipedia.org/wiki/Structured_interview) as the basis. |
| Behavioural questions without STAR cues for the listener | Different interviewers listen for different things; scoring drifts. | Step 3 STAR cues are mandatory for behavioural questions. |
| Letting interviewers free-form their own follow-ups | The dominant source of interview noise. | Step 3 pre-authored follow-up probes. |
| Authoring the question bank without the rubric | Half a structured interview - questions without scoring still drift. | Hand-off block insists on `hiring-rubric-author` next. |

## Limitations

- **The bank is not a substitute for technical screening.** A take-home or coding round is still recommended for SDET / automation roles where hands-on code is load-bearing. The skill produces interview questions, not coding exercises.
- **STAR cues are heuristics, not auto-scoring.** The interviewer still has to listen and score. The cue list reduces variance but does not eliminate it.
- **Bloom's levels are the ISTQB-canonical proxy, not a perfect difficulty measure.** A K3 question can be more or less difficult than another K3 depending on the topic. Use the level as a coarse mix knob, not a fine-grained difficulty score.
- **Locale / language localisation is the team's responsibility.** Behavioral questions translated literally can lose nuance; the skill emits English-language defaults.
- **Legal compliance varies by jurisdiction.** Some questions (age, family, health) are illegal in some jurisdictions and merely poor practice in others. The skill includes a default forbidden-topics list (age, family status, religion, sexual orientation, disability, national origin, citizenship except where role-required) but the hiring team is responsible for jurisdiction-specific compliance - see [`legal-compliance-checker`](../../qa-compliance/) ecosystem.

## Hand-off targets

- **Score the questions consistently** → [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md).
- **Calibrate interviewers** → [`calibration-guide-author`](../calibration-guide-author/SKILL.md).
- **Compliance review of the question set** → the team's legal / HR review (out of marketplace scope; flagged here so the hiring manager remembers).

## References

- ISTQB Certified Tester Foundation Level v4.0 syllabus - competency areas (test design, test management, test process, defect management, tools); cite by stable syllabus version (v4.0, 2023): https://www.istqb.org/certifications/certified-tester-foundation-level
- ISTQB glossary - defect, defect-density, escaped-defect, test design technique (the canonical competency vocabulary): https://glossary.istqb.org/
- STAR behavioral interviewing method - Situation / Task / Action / Result framework: https://en.wikipedia.org/wiki/Situation,_task,_action,_result
- Structured interview research - Levashina et al. 2014 ([*Personnel Psychology*](https://en.wikipedia.org/wiki/Structured_interview)) on the validity uplift from structured employment interviews; the methodological basis for this skill's "same questions, same order, same scoring" defaults.
- Bloom's taxonomy - K1 remember / K2 understand / K3 apply / K4 analyse - ISTQB-adopted cognitive-difficulty levels: https://en.wikipedia.org/wiki/Bloom%27s_taxonomy
- PractiTest 2026 State of Testing Report - hiring rubric / interview question generation cited as a high-adoption, low-risk AI use case for QA managers: https://www.practitest.com/state-of-testing/
- [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md), [`calibration-guide-author`](../calibration-guide-author/SKILL.md) - sibling skills that complete the structured-interview triple.
