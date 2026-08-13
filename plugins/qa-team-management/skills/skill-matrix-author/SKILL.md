---
name: skill-matrix-author
description: "Build-an-X workflow that produces a QA team skill matrix - team members crossed with competency dimensions at explicit proficiency levels, each cell backed by observable evidence - then derives the full gap analysis: classify each gap (coverage / capability / bus-factor / surplus), rank the gaps against the team's roadmap, and recommend a closing move per gap (train / peer-learn vs hire vs external expert). Competency dimensions follow ISTQB CTAL-TM v3.0 chapter 3 (Managing the Team): professional, methodological, social, and personal competence. Maps the existing team on an ongoing basis - not a point-in-time score of external candidates and not one new hire's ramp plan. Use when a QA manager needs to know what the team can do today versus what its projects demand - before quarterly planning, a training-budget decision, or opening a requisition."
metadata:
  keywords: "skill-matrix, competency, qa-team, gap-analysis, ctal-tm, test-management, capability"
---

# skill-matrix-author

## Overview

Per ISTQB CTAL-TM v3.0 section 3.1.3, "test management needs to assess the existing test team skills and compare these with the required skills, which may be documented in a skills matrix" (CTAL-TM v3.0 §3.1.3, 2024; syllabus in References). This skill produces that matrix: rows are team members, columns are competency dimensions, and each cell carries a proficiency level plus the evidence that justifies it.

The output is two artifacts: the **matrix** (current state) and the **gap analysis** (matrix compared against the skills the team's projects require). The matrix without the comparison is a wall chart; the comparison is what drives training, hiring, and allocation decisions.

## When to use

- A QA manager inherits or builds a team and needs a current-state capability map.
- The team's work is changing (new tech stack, new test level, new domain) and the manager must know whether the team can cover it.
- Before quarterly planning: the matrix plus gap analysis feeds the training budget and the hiring case.
- Before a training-budget decision or opening a requisition: Step 7's ranked gap report is the evidence the manager takes into those conversations.

Do **not** use this skill to:

- Score job candidates - that is `hiring-rubric-author` (in qa-hiring; point-in-time, per-candidate, anchored to interview questions).
- Plan one new hire's first 90 days - that is `onboarding-plan-author` (in qa-hiring).
- Write individual performance feedback. The matrix describes capability, not performance; conflating them poisons the data (see Anti-patterns).

## Step 1 - Capture the inputs

| Input | Notes |
|---|---|
| **Team roster** | Names or anonymized IDs, current role, tenure on team |
| **Required-skills context** | The team's test strategy, active projects, tech stack, test levels and test types in scope. Per CTAL-TM 3.1.2, "a detailed context analysis is required to determine the required skills for a project" - system domain, architecture and technologies, and SDLC all drive required professional competence (CTAL-TM v3.0 §3.1.2) |
| **Evidence sources** | Work samples per member: test strategies authored, review findings, test code, completion reports, certifications, prior assessments |
| **Prior matrix** | Optional; enables trend ("who grew since last cycle") |

Halt with `MISSING_REQUIRED_SKILLS_CONTEXT` if no test strategy or project context is supplied: a matrix with no "required" column cannot produce a gap analysis, only an inventory.

## Step 2 - Pick the competency dimensions

CTAL-TM v3.0 section 3.1.1 classifies skills into **four areas of competence** (after Sonntag & Schmidt-Rathjens 2005 and Erpenbeck & von Rosenstiel 2017, the model the syllabus adopts):

1. **Professional competence** - "skills to perform specialized tasks": test techniques, technological and business expertise in the application domain, project management skills.
2. **Methodological competence** - "general skills that a person can use independently in a domain": analytical, conceptual, and judgmental skills.
3. **Social competence** - communication, cooperation, and conflict management; "they enable one to relate to others in order to act appropriately in a given situation".
4. **Personal competence** - "the ability and willingness to develop oneself": self-management, reliability, resilience, ability to receive criticism, openness to change.

(All four definitions: CTAL-TM v3.0 §3.1.1.)

Expand **professional competence** into 4 - 8 team-specific columns. CTAL-TM 3.1.2 maps skills to test activities - test planning needs conceptual strategy knowledge, test analysis needs analytical skill on the test basis and product risks, test implementation needs "technical expertise for test script programming and setting up test environments", test execution needs expertise in automated execution, exploratory testing, and result evaluation (§3.1.2). A typical web-product team lands on columns like: test design techniques, exploratory testing, test automation (team's framework), API testing, CI pipeline ownership, domain knowledge, performance testing, accessibility testing.

Keep methodological, social, and personal competence as 1 - 2 columns each, not expanded per sub-skill. The matrix is a management instrument, not a psychometric one; 8 - 12 total columns is the usable ceiling.

## Step 3 - Define the proficiency scale with evidence rules

The syllabus prescribes assessment techniques, not a numeric scale; the 0 - 3 scale below is a working team default, not an ISTQB artifact:

| Level | Meaning | Minimum evidence |
|---|---|---|
| **0 - none** | No exposure | (absence of evidence is fine here) |
| **1 - aware** | Understands concepts; cannot execute unaided | Training completed, certification, or reviewed-but-not-authored work |
| **2 - practitioner** | Executes independently on team-typical tasks | Authored work artifacts on this team (test cases, automation, strategy sections) |
| **3 - coach** | Executes on novel problems and grows others in it | Artifacts plus observed teaching: review comments that taught, mentoring record, internal training delivered |

Evidence rules follow CTAL-TM 3.1.3, which says professional and methodological competence "can be assessed by demonstrating typical test tasks": outlining a test strategy and discussing feedback, reviewing the test basis and communicating findings, determining test techniques for a given context, applying test techniques, and writing a test completion report that assesses results. It adds that "skills can be assessed through external credentials, certifications, work experience, and degrees" (§3.1.3).

**The load-bearing rule: no cell above level 1 on self-assessment alone.** A level-2 or level-3 cell must name at least one artifact or observed demonstration. Self-assessment seeds the draft; evidence locks the value.

## Step 4 - Fill the matrix

One row per member, one column per dimension. Each cell is a 0 - 3 level, and every cell above 1 carries a footnote naming its evidence. Add a final **team-need row** per column (`req. / have`): the level the team needs in at least N people against what it has. Minimal shape:

```markdown
| Member | Test design | Playwright automation | Perf (k6) |
|---|---|---|---|
| Anna (lead) | 3 [^a1] | 2 [^a3] | 1 |
| Boris | 2 [^b1] | 3 [^b2] | 0 |
| **Team need (req. / have)** | 2 in 3+ / have 3 | 2 in 3+ / have 3 | 2 in 2+ / **have 1** |

[^a1]: Authored the 2026 checkout test strategy; ran the team's test-design workshop.
```

The footnote-per-cell convention is what makes the matrix auditable: anyone can challenge a 3 by reading its evidence. See [references/skill-matrix-example.md](references/skill-matrix-example.md) for the full 5-person matrix with every professional-competence column and evidence footnote.

## Step 5 - Derive the gap analysis

For each column, set the **required level and depth** ("level 2 in at least 3 people") from the Step 1 context, then compare. CTAL-TM 3.1.4 frames this exactly: "identify necessary development needs by comparing required with available skills in a skills matrix" (§3.1.4). Classify each gap:

| Gap class | Signal | Typical response |
|---|---|---|
| **Coverage gap** | Required level exists in fewer people than needed | Training or peer learning |
| **Capability gap** | Required level exists in nobody | Training with external input, hiring, or external expert (CTAL-TM 3.1 notes external experts for tasks "beyond the capabilities of the test team") |
| **Bus-factor gap** | Exactly one person at required level on a critical column | Pairing and mentoring to spread it |
| **Surplus** | Capability with no project demand | Reallocation candidate, or a deliberate strategic bet |

In the worked example: performance testing is a **bus-factor gap** (Dana alone at level 2 against a need of 2 people), and the matrix shows no capability gap. That one row is the actionable output of the whole exercise.

## Step 6 - Attach development options per gap

For each gap, list candidate development approaches. CTAL-TM 3.1.4 enumerates five: training and education, self-study, peer learning, mentoring or coaching, and training on the job - and notes they are not equally effective per competence area: "self-study and training, for example, are well suited for developing professional and methodological competence", while for social and personal competence "it is recommended to use approaches such as training and coaching, which are often more promising than self-study" (§3.1.4).

## Step 7 - Prioritize gaps against the roadmap and recommend closing moves

The matrix plus classification is still an inventory until it meets demand.
This step joins supply (the matrix) against demand (the roadmap) and emits
the report the manager takes into planning, budget, or requisition
conversations.

**7a - Extract demand from the roadmap.** Read the supplied roadmap, test
strategy, or quarter plan. For each roadmap item, list the competencies it
demands and the depth (how many people, at what level, by when). Per CTAL-TM
3.1.2, required skills follow from the project context - system domain,
architecture and technologies, and SDLC - not from a generic checklist.
Roadmap items whose competency demand cannot be inferred go into an
`UNMAPPED ROADMAP ITEMS` list rather than being guessed. **No roadmap or
test-needs input, no gap report** - a matrix alone yields an inventory, not
gaps; halt with `MISSING_DEMAND_INPUT`.

**7b - Rank the gaps.** Order by: (1) roadmap proximity (a gap blocking next
quarter outranks one blocking H2); (2) gap class (capability > bus-factor >
coverage, because lead time to close differs); (3) blast radius of the
roadmap items affected. Emit the ranking with the reasoning visible, not
just the order.

**7c - Recommend a closing move per gap**, stating the heuristic with each
recommendation:

- **Train / peer-learn** when an adjacent skill exists in-team at level 2+
  and the deadline allows a ramp (coverage and bus-factor gaps, typically).
- **Hire** when it is a capability gap on a sustained need with no in-team
  seed skill, or when training demand exceeds the team's absorptive capacity
  for the window.
- **External expert / contract** for a one-off need; CTAL-TM 3.1 notes
  bringing in external experts for tasks beyond the team's capabilities.

**7d - Emit the gap report** (`docs/capability-gap-report-<YYYY-MM-DD>.md`):
(1) inputs block naming the matrix file, its date, and the roadmap source;
(2) ranked gap table (gap, class, roadmap items blocked, deadline, evidence
row / column reference); (3) per-gap recommendation (move, rationale, first
concrete step, owner suggestion); (4) `UNMAPPED ROADMAP ITEMS`; (5) a "not
considered" section (individual performance, compensation, vendor selection).

Gap-analysis guardrails:

- **Never analyze a self-assessment-only matrix.** Cells above level 1 with
  no artifact citations or observation notes mean the Step 3 evidence rule
  was skipped; fix the matrix first and name the offending cells.
- **Mark stale matrices** (older than ~2 quarters, or predating a team
  change named in the roadmap) and recommend re-assessment; do not silently
  analyze on top.
- **Never rank individuals.** The unit of analysis is the capability column,
  not the person; "who is the weakest tester" is a performance question and
  out of scope.
- **Never invent budget, salary, or market-availability figures** for the
  train-vs-hire comparison; mark them `[DATA NOT SUPPLIED]`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Self-assessment-only matrix | Unanchored ratings drift toward the middle; the gap analysis inherits fiction | Step 3 evidence rule: nothing above level 1 without an artifact |
| Using the matrix in performance reviews | Members learn to inflate cells; the instrument dies as a planning tool | Keep capability (this skill) and performance feedback as separate artifacts |
| Gap analysis without a roadmap input | Supply without demand is an inventory, not a gap report | Step 7a halts on `MISSING_DEMAND_INPUT` |
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

- **A capability gap becomes a hiring case** → `qa-jd-author` then the qa-hiring structured-interview chain; the matrix's competency vocabulary stays consistent with `hiring-rubric-author`.
- **A gap resolves to training** → the matrix owner's growth conversations per member; the member's matrix row seeds the growth agenda.

## References

- ISTQB Certified Tester Advanced Level Test Management Syllabus v3.0 (2024-05-03), chapter 3 "Managing the Team", sections 3.1.1 - 3.1.6 - four areas of competence, required-skill analysis, skills-matrix assessment, development approaches: https://astqb.org/assets/documents/ISTQB_CTAL-TM_Syllabus_v3.0.pdf (fetched 2026-06-10).
- ISTQB glossary - skills management terminology: https://glossary.istqb.org/
- `hiring-rubric-author` (in qa-hiring) - the point-in-time candidate-scoring counterpart.
