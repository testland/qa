---
name: skill-matrix-author
description: "Build-an-X workflow that produces a QA team skill matrix - team members crossed with competency dimensions at explicit proficiency levels, each cell backed by observable evidence - then derives a gap analysis comparing the matrix against the team's required testing skills. Competency dimensions follow ISTQB CTAL-TM v3.0 chapter 3 (Managing the Team): professional, methodological, social, and personal competence. Maps the existing team on an ongoing basis - not a point-in-time score of external candidates, not the downstream prioritization of those gaps against a roadmap, and not one new hire's ramp plan. Use when a QA manager needs to know what the team can do today versus what its projects demand - before planning training, hiring, or work allocation."
metadata:
  keywords: "skill-matrix, competency, qa-team, gap-analysis, ctal-tm, test-management, capability"
---

# skill-matrix-author

## Overview

Per ISTQB CTAL-TM v3.0 section 3.1.3, "test management needs to assess the existing test team skills and compare these with the required skills, which may be documented in a skills matrix" ([ISTQB CTAL-TM Syllabus v3.0, 2024](https://astqb.org/assets/documents/ISTQB_CTAL-TM_Syllabus_v3.0.pdf), fetched 2026-06-10). This skill produces that matrix: rows are team members, columns are competency dimensions, and each cell carries a proficiency level plus the evidence that justifies it.

The output is two artifacts: the **matrix** (current state) and the **gap analysis** (matrix compared against the skills the team's projects require). The matrix without the comparison is a wall chart; the comparison is what drives training, hiring, and allocation decisions.

## When to use

- A QA manager inherits or builds a team and needs a current-state capability map.
- The team's work is changing (new tech stack, new test level, new domain) and the manager must know whether the team can cover it.
- Before quarterly planning: the matrix plus gap analysis feeds the training budget and the hiring case.
- As the required input for downstream gap prioritization against a concrete roadmap.

Do **not** use this skill to:

- Score job candidates - that is `hiring-rubric-author` (in qa-hiring; point-in-time, per-candidate, anchored to interview questions).
- Plan one new hire's first 90 days - that is `onboarding-plan-author` (in qa-hiring).
- Write individual performance feedback - that is [`performance-feedback-author`](../performance-feedback-author/SKILL.md). The matrix describes capability, not performance; conflating them poisons the data (see Anti-patterns).

## Step 1 - Capture the inputs

| Input | Notes |
|---|---|
| **Team roster** | Names or anonymized IDs, current role, tenure on team |
| **Required-skills context** | The team's test strategy, active projects, tech stack, test levels and test types in scope. Per CTAL-TM 3.1.2, "a detailed context analysis is required to determine the required skills for a project" - system domain, architecture and technologies, and SDLC all drive required professional competence ([CTAL-TM v3.0 §3.1.2](https://astqb.org/assets/documents/ISTQB_CTAL-TM_Syllabus_v3.0.pdf)) |
| **Evidence sources** | Work samples per member: test strategies authored, review findings, test code, completion reports, certifications, prior assessments |
| **Prior matrix** | Optional; enables trend ("who grew since last cycle") |

Halt with `MISSING_REQUIRED_SKILLS_CONTEXT` if no test strategy or project context is supplied: a matrix with no "required" column cannot produce a gap analysis, only an inventory.

## Step 2 - Pick the competency dimensions

CTAL-TM v3.0 section 3.1.1 classifies skills into **four areas of competence** (after Sonntag & Schmidt-Rathjens 2005 and Erpenbeck & von Rosenstiel 2017, the model the syllabus adopts):

1. **Professional competence** - "skills to perform specialized tasks": test techniques, technological and business expertise in the application domain, project management skills.
2. **Methodological competence** - "general skills that a person can use independently in a domain": analytical, conceptual, and judgmental skills.
3. **Social competence** - communication, cooperation, and conflict management; "they enable one to relate to others in order to act appropriately in a given situation".
4. **Personal competence** - "the ability and willingness to develop oneself": self-management, reliability, resilience, ability to receive criticism, openness to change.

(All four definitions: [CTAL-TM v3.0 §3.1.1](https://astqb.org/assets/documents/ISTQB_CTAL-TM_Syllabus_v3.0.pdf).)

Expand **professional competence** into 4 - 8 team-specific columns. CTAL-TM 3.1.2 maps skills to test activities - test planning needs conceptual strategy knowledge, test analysis needs analytical skill on the test basis and product risks, test implementation needs "technical expertise for test script programming and setting up test environments", test execution needs expertise in automated execution, exploratory testing, and result evaluation ([§3.1.2](https://astqb.org/assets/documents/ISTQB_CTAL-TM_Syllabus_v3.0.pdf)). A typical web-product team lands on columns like: test design techniques, exploratory testing, test automation (team's framework), API testing, CI pipeline ownership, domain knowledge, performance testing, accessibility testing.

Keep methodological, social, and personal competence as 1 - 2 columns each, not expanded per sub-skill. The matrix is a management instrument, not a psychometric one; 8 - 12 total columns is the usable ceiling.

## Step 3 - Define the proficiency scale with evidence rules

The syllabus prescribes assessment techniques, not a numeric scale; the 0 - 3 scale below is a working team default, not an ISTQB artifact:

| Level | Meaning | Minimum evidence |
|---|---|---|
| **0 - none** | No exposure | (absence of evidence is fine here) |
| **1 - aware** | Understands concepts; cannot execute unaided | Training completed, certification, or reviewed-but-not-authored work |
| **2 - practitioner** | Executes independently on team-typical tasks | Authored work artifacts on this team (test cases, automation, strategy sections) |
| **3 - coach** | Executes on novel problems and grows others in it | Artifacts plus observed teaching: review comments that taught, mentoring record, internal training delivered |

Evidence rules follow CTAL-TM 3.1.3, which says professional and methodological competence "can be assessed by demonstrating typical test tasks": outlining a test strategy and discussing feedback, reviewing the test basis and communicating findings, determining test techniques for a given context, applying test techniques, and writing a test completion report that assesses results. It adds that "skills can be assessed through external credentials, certifications, work experience, and degrees" ([§3.1.3](https://astqb.org/assets/documents/ISTQB_CTAL-TM_Syllabus_v3.0.pdf)).

**The load-bearing rule: no cell above level 1 on self-assessment alone.** A level-2 or level-3 cell must name at least one artifact or observed demonstration. Self-assessment seeds the draft; evidence locks the value.

## Step 4 - Fill the matrix

Worked example fragment (5-person team, professional-competence columns shown; `req.` is the level the team needs in at least N people, derived in Step 5):

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

The footnote-per-cell convention is what makes the matrix auditable: anyone can challenge a 3 by reading its evidence.

## Step 5 - Derive the gap analysis

For each column, set the **required level and depth** ("level 2 in at least 3 people") from the Step 1 context, then compare. CTAL-TM 3.1.4 frames this exactly: "identify necessary development needs by comparing required with available skills in a skills matrix" ([§3.1.4](https://astqb.org/assets/documents/ISTQB_CTAL-TM_Syllabus_v3.0.pdf)). Classify each gap:

| Gap class | Signal | Typical response |
|---|---|---|
| **Coverage gap** | Required level exists in fewer people than needed | Training or peer learning |
| **Capability gap** | Required level exists in nobody | Training with external input, hiring, or external expert (CTAL-TM 3.1 notes external experts for tasks "beyond the capabilities of the test team") |
| **Bus-factor gap** | Exactly one person at required level on a critical column | Pairing and mentoring to spread it |
| **Surplus** | Capability with no project demand | Reallocation candidate, or a deliberate strategic bet |

In the worked example: performance testing is a **bus-factor gap** (Dana alone at level 2 against a need of 2 people), and the matrix shows no capability gap. That one row is the actionable output of the whole exercise.

## Step 6 - Attach development options per gap

For each gap, list candidate development approaches. CTAL-TM 3.1.4 enumerates five: training and education, self-study, peer learning, mentoring or coaching, and training on the job - and notes they are not equally effective per competence area: "self-study and training, for example, are well suited for developing professional and methodological competence", while for social and personal competence "it is recommended to use approaches such as training and coaching, which are often more promising than self-study" ([§3.1.4](https://astqb.org/assets/documents/ISTQB_CTAL-TM_Syllabus_v3.0.pdf)).

Do not pick the response in this skill. Prioritizing gaps against the roadmap and recommending train-vs-hire is a separate downstream step; this skill ends by handing it a complete, evidence-backed matrix.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Self-assessment-only matrix | Unanchored ratings drift toward the middle; the gap analysis inherits fiction | Step 3 evidence rule: nothing above level 1 without an artifact |
| Using the matrix in performance reviews | Members learn to inflate cells; the instrument dies as a planning tool | Keep capability (this skill) and performance ([`performance-feedback-author`](../performance-feedback-author/SKILL.md)) as separate artifacts |
| 20+ columns | Nobody maintains it; cells go stale within a quarter | 8 - 12 columns; fold detail into evidence footnotes |
| Matrix without required levels | Pure inventory; cannot say whether the team is in trouble | Step 5 requires a `req.` row per column |
| Copying another team's columns | Required skills come from this team's context analysis (CTAL-TM 3.1.2), not a template | Derive columns from the team's own strategy and stack in Step 2 |
| One-off exercise | Skills change; CTAL-TM 3.1 notes "the skills required by a test team member may change over time" | Re-assess on a fixed cadence (quarterly or per planning cycle) and keep the prior matrix for trend |

## Limitations

- **Evidence quality varies by competence area.** Professional competence has artifacts; social and personal competence rely on observed behavior, which CTAL-TM 3.1.3 supports via demonstration and retrospective feedback but which stays more subjective. Mark those cells `observed` rather than artifact-cited.
- **The 0 - 3 scale is a convention, not a standard.** ISTQB defines assessment techniques, not levels; teams comparing matrices across orgs cannot assume the numbers align.
- **The matrix is sensitive data.** Named proficiency levels affect people; restrict circulation to the manager and the member, and anonymize before any wider sharing.
- **No psychometric validity.** This is a management planning instrument. Team-role models the syllabus mentions (e.g., Belbin's team roles, CTAL-TM 3.1.3) are out of scope here.

## Hand-off targets

- **Prioritize the gaps against the roadmap, recommend train vs hire** → a downstream gap-prioritization step that consumes this matrix.
- **A capability gap becomes a hiring case** → `qa-jd-author` then the qa-hiring structured-interview chain.
- **A growth conversation per member** → [`tester-one-on-one-planner`](../tester-one-on-one-planner/SKILL.md); the member's matrix row seeds the growth half of the agenda.
- **Level expectations over time** → [`career-ladder-author`](../career-ladder-author/SKILL.md); the ladder defines progression, the matrix measures today.

## References

- ISTQB Certified Tester Advanced Level Test Management Syllabus v3.0 (2024-05-03), chapter 3 "Managing the Team", sections 3.1.1 - 3.1.6 - four areas of competence, required-skill analysis, skills-matrix assessment, development approaches: https://astqb.org/assets/documents/ISTQB_CTAL-TM_Syllabus_v3.0.pdf (fetched 2026-06-10).
- ISTQB glossary - skills management terminology: https://glossary.istqb.org/
- `hiring-rubric-author` (in qa-hiring) - the point-in-time candidate-scoring counterpart.
