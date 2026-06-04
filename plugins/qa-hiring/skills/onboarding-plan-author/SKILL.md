---
name: onboarding-plan-author
description: "Build-an-X workflow that produces a 30-60-90 day onboarding plan for a newly hired QA engineer - takes seniority level (junior / mid / senior / lead) plus the team's hiring rubric and emits phase-gated ramp milestones, competency targets mapped to the rubric axes, mentor cadence, and success criteria per phase. Distinct from `calibration-guide-author` (which closes the interview loop before hire) and `hiring-rubric-author` (which scores candidates during the loop); this skill produces the post-hire ramp artifact. Use when a QA engineer has been hired and the hiring manager or team lead needs a structured first-90-days plan before the new hire's start date."
rating: 22
d6: 2
---

# onboarding-plan-author

## Overview

Hiring ends at offer acceptance; onboarding is where the competency signal from the rubric is converted into a development plan. The 30-60-90 day framework - originally popularized by Michael Watkins' *The First 90 Days* (2003, Harvard Business Review Press) as the canonical structured-transition framework for new organizational members - divides the ramp into three equal phases: learn (days 1-30), integrate (days 31-60), and contribute independently (days 61-90). Each phase has a distinct focus, observable exit criteria, and a handoff to the next. (Notion blog on the 30-60-90 day plan framework: https://www.notion.com/blog/30-60-90-day-plan; Wikipedia, "Onboarding": https://en.wikipedia.org/wiki/Onboarding.)

The plan this skill produces anchors each phase's competency targets to the six rubric axes from [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md): test analysis and design, defect lifecycle, test code conventions (automation roles), tooling depth, communication, and domain reasoning. Rather than treating onboarding as a generic HR checklist, the plan treats it as a continuation of the structured-interview signal - a hire scored 2 on "test code conventions" during the loop gets targeted development investment in exactly that axis during phase 2.

The PractiTest 2026 State of Testing Report found that nearly 40% of individual contributors feel "test strategy" is underdeveloped in their teams, and that practitioners who pivot toward strategy earn a +10.6% income premium versus those who remain in pure technical execution (https://www.practitest.com/state-of-testing/). The plan's day-61-90 phase directly addresses this gap by pushing the hire toward strategy ownership proportional to seniority.

## When to use

- A QA engineer has been hired and the manager needs a written ramp plan before the start date.
- A team is standardising onboarding across a growing QA function and wants per-seniority templates.
- A new hire's onboarding has stalled; the plan provides a diagnostic frame (which phase exit criteria are unmet?).

Do **not** use this skill to:

- Score candidates - that is [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md).
- Produce interviewer calibration material - that is [`calibration-guide-author`](../calibration-guide-author/SKILL.md).
- Create a career development or performance-review plan beyond the 90-day window. This skill covers the ramp to independent contribution; ongoing career laddering is out of scope.

## Step 1 - Capture the inputs

Required:

| Input | Notes |
|---|---|
| **Seniority** | `junior` / `mid` / `senior` / `lead` - the same axis used in the hiring rubric |
| **Role variant** | `manual-qa-engineer` / `qa-automation-engineer` / `sdet` / `test-lead` - determines which rubric axes are load-bearing |
| **Rubric scores** | The per-dimension hire scores from [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md) - axes scored 2 ("borderline") get targeted phase-2 development plans, not just the default milestones |
| **Team context** | Stack, CI toolchain, domain (fintech / consumer / B2B SaaS / etc.) - informs phase-1 environment setup and phase-2 tooling targets |
| **Mentor availability** | Whether a dedicated senior QA mentor is available, or whether the new hire will pair with an engineering team member |

If rubric scores are not available (e.g., an informal hire), the plan defaults to treating all six axes as equally weighted development targets and flags this assumption explicitly in the output.

## Step 2 - Determine the seniority multiplier

Seniority changes the *pace* and *scope* of the plan, not its three-phase structure. The table below describes the expected exit state for each seniority at day 90 - the plan's success criteria derive from this:

| Seniority | Day-30 exit | Day-60 exit | Day-90 exit |
|---|---|---|---|
| **Junior** | Environment set up; first test case authored and passing in CI; has read the team's test conventions doc | Owns one test suite with no supervision; contributing to defect triage meetings | Participating in test planning for a sprint; mentor cadence reduces to fortnightly |
| **Mid** | Environment set up; first test authored and reviewed; independently diagnosed one CI failure | Owns a feature's test coverage from planning through execution; identified at least one test-architecture gap | Leads test planning for a sprint; peers consult them on test design questions |
| **Senior** | Environment set up; independent on toolchain; has reviewed one teammate's test PR and provided actionable feedback | Owns test strategy for a component or service; running the weekly test review meeting | Driving test strategy for the team; mentoring junior or mid QA hires; identifiable as the quality signal for a release |
| **Lead** | Independent on toolchain and team norms; has mapped the team's test coverage gaps; has met all stakeholders (product, engineering, support) | Owns the test strategy document for the quarter; running test-planning ceremonies | Quality-gate ownership at the release level; proposals for tooling or process changes with team sign-off |

[author opinion] These exit criteria follow the general "learn - integrate - contribute" arc described in the 30-60-90 day literature, adapted to QA-specific observable outputs. The pace should be recalibrated if the team's domain or compliance environment (e.g., healthcare, finance) has an unusually long environment-access ramp.

## Step 3 - Author the three-phase plan

For each seniority, the skill emits three sections. The structure below is for a `mid` `qa-automation-engineer`; adjust the target values per the multiplier table in Step 2 and the rubric scores from Step 1.

### Phase 1 (days 1-30): Learn

**Focus:** environment, context, and first contribution. Per the 30-60-90 day framework (https://www.notion.com/blog/30-60-90-day-plan), this phase centres on acquiring the knowledge and role clarity needed to begin contributing - not on producing output.

**Milestones:**

1. Development environment running and verified against the team's setup doc by day 3.
2. All repository access, CI pipelines, and test-infrastructure credentials provisioned by day 5.
3. Read the team's test conventions document and the project's domain README by day 7.
4. Paired with mentor for a 1-hour walkthrough of the existing test suite by day 7.
5. First test case authored (existing coverage gap identified by the mentor) passing in CI by day 14.
6. Attended one sprint planning, one defect triage, and one retrospective by day 21.
7. Written a bug report for a defect found during exploratory testing, reviewed by a senior QA or engineer by day 28.
8. Completed ISTQB Foundation Level Chapter 1 self-study (Fundamentals of Testing) if not already certified (ISTQB CTFL v4.0 syllabus: https://astqb.org/certifications/foundation-level-certification/) by day 30.

**Competency targets (rubric axes - first contact):**

| Rubric axis | Phase-1 target |
|---|---|
| Test analysis and design | Can name the technique used when authoring the first test (boundary, equivalence partition, or decision-table) |
| Defect lifecycle | Writes a bug report that includes steps to reproduce, expected vs. actual, environment, and severity - reviewed and accepted by a senior |
| Test code conventions | First test passes lint and follows the team's naming convention |
| Tooling depth | Can run the test suite locally, filter by tag, and read a CI run log |
| Communication | Attends ceremonies and asks one clarifying question per session |
| Domain reasoning | Can describe the product's user journey at a feature level |

**Mentor cadence (phase 1):** 30-minute daily check-in for the first 2 weeks; 1-hour weekly thereafter. Mentor reviews all authored tests before merge.

**Success criteria for phase-1 exit:** First test merged to the main test suite; bug report accepted without revision; mentor confirms independent environment operation.

---

### Phase 2 (days 31-60): Integrate

**Focus:** applying skills under supervision and owning a bounded scope. Per the 30-60-90 day framework, this phase shifts toward integration with the team and application of the new hire's existing skills, moving from supervised contribution to scoped ownership.

**Milestones:**

1. Takes ownership of one feature's test suite - additions, maintenance, and CI failures - by day 35.
2. Attends all sprint test-planning sessions and proposes at least one test case per story by day 40.
3. Reviews one teammate's test PR and provides written feedback by day 45.
4. Identifies and documents one test-architecture gap (e.g., a boundary class with no negative tests) by day 50.
5. Runs a 30-minute knowledge-share session for the QA or engineering team (format: what I learned in month 1) by day 55.
6. Completes ISTQB Foundation Level Chapters 2-4 self-study (Test Activities and Roles; Static Testing; Test Analysis and Design) if not certified by day 60.

**Competency targets (rubric axes - applied):**

| Rubric axis | Phase-2 target |
|---|---|
| Test analysis and design | Applies at least two ISTQB techniques (from CTFL Ch. 4: equivalence partitioning, boundary value analysis, decision table, state transition - https://astqb.org/certifications/foundation-level-certification/) independently to a real feature |
| Defect lifecycle | Owns the defect-triage process for the owned feature suite; can distinguish defect vs. failure per ISTQB glossary terminology |
| Test code conventions | Test PRs pass review without convention-related comments on second PR and after |
| Tooling depth | Can diagnose a flaky test (identify root cause from the CI log) and open a fix PR without mentor assistance |
| Communication | Delivers the knowledge-share session without material feedback from the mentor |
| Domain reasoning | Can map a new user story to the affected test boundary without prompting |

**Targeted development for rubric-axis score of 2 (borderline at hire):** For each axis where the hire scored "borderline" during the loop, the plan adds a specific paired-learning task: e.g., a score-2 on "test code conventions" triggers a required code-review pairing with a senior on two consecutive PRs; a score-2 on "defect lifecycle" triggers a defect-retrospective exercise where the hire re-examines three historical bug reports and identifies the point of detection vs. the point of failure.

**Mentor cadence (phase 2):** 1-hour weekly; mentor shifts from prescriptive reviewer to code-review approver. Mentor stops blocking on approvals by day 45 (the hire uses the team's standard PR review process).

**Success criteria for phase-2 exit:** Owned feature suite green in CI with no unreviewed failures; architecture-gap document shared and acknowledged by the team; knowledge-share delivered.

---

### Phase 3 (days 61-90): Contribute independently

**Focus:** independent contribution and the beginning of strategy ownership proportional to seniority. Per the 30-60-90 day framework, this phase prepares the hire to lead their first project or initiative - moving from "applying skills" to "driving decisions."

**Milestones:**

1. Leads test planning for one sprint end-to-end (story estimation, test-case authorship, risk identification) by day 70.
2. Produces a one-page test-coverage assessment for an assigned component, with a risk-ranked gap list, by day 75.
3. Proposes one process or tooling improvement with a concrete rationale and presents it at the team's retro by day 80.
4. Completes ISTQB Foundation Level Chapters 5-6 self-study (Managing the Test Activities; Test Tools) if not certified by day 85.
5. First 30-minute solo 1:1 with hiring manager at day 90: hire drives the agenda using the success criteria below.

**Competency targets (rubric axes - owned):**

| Rubric axis | Phase-3 target |
|---|---|
| Test analysis and design | Authors a test strategy note for a sprint (not just individual test cases) - identifies which techniques apply and why |
| Defect lifecycle | Tracks defect escape rate for the owned suite over two sprints and presents the trend to the team |
| Test code conventions | Test PRs pass review first-pass on average (no convention-related revision comments) |
| Tooling depth | Has extended or configured at least one existing test-infrastructure component (e.g., added a new test tag, extended a shared fixture, or updated a CI step) |
| Communication | Written sprint test-coverage summary shared with product and engineering without prompting |
| Domain reasoning | Can identify the highest-risk user flows for a new feature with no rubric reference - asks product or engineering for confirmation, not instruction |

**Mentor cadence (phase 3):** Bi-weekly 30-minute check-in; mentor role shifts from reviewer to consultant. New hire sets the agenda. Formal mentor relationship closes at day 90; standard peer-review process applies thereafter.

**Success criteria for phase-3 (day-90) exit - the success criteria double as the hiring manager's 90-day review inputs:**

1. Owns at least one test suite end-to-end with no unresolved CI failures.
2. Has led at least one sprint's test planning with documented coverage decisions.
3. Has produced at least one written artifact (coverage assessment, process proposal, or knowledge-share) that other team members reference.
4. Rubric-axis score improvements: any axis scored "borderline" at hire has a documented development event (pairing session, retro exercise, PR review) with a mentor note on progress.
5. Peer feedback (from one engineer and one QA reviewer, gathered by the hiring manager): the hire is "someone I can hand a feature to."

## Step 4 - Emit the plan

The output is a single markdown document with:

1. **Header**: hire name (or placeholder), role, seniority, start date, hiring manager, mentor.
2. **Rubric-score summary**: the per-axis hire scores from the structured interview, copied from the rubric output - these anchor the targeted-development items in phase 2.
3. **Three phase sections** (Step 3 structure per seniority).
4. **Milestone tracker table**: a flat checklist of all milestones with day targets and owner (hire / mentor / hiring manager) for easy status tracking.
5. **Hand-off block**:

```markdown
## HAND-OFF

1. Share this plan with the new hire on or before day 1. The plan is not confidential - the hire should know the success criteria they are being evaluated against.
2. Hiring manager reviews phase-exit criteria at day 30, 60, and 90. Any unmet criterion triggers a targeted conversation, not a performance note.
3. If any rubric axis remains at "borderline" at day 60, schedule a second targeted-development pairing before day 75.
4. At day 90, archive this plan alongside the rubric output in the team's hiring record. The three artifacts (question bank, rubric, onboarding plan) together form the hiring-to-ramp provenance trail.
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Identical onboarding plans regardless of seniority | A lead who spends 30 days on environment setup and basic test authoring is wasted and will disengage. | Step 2's seniority multiplier sets phase-exit expectations; senior and lead plans front-load ownership. |
| Ignoring the rubric scores | The structured interview identified the hire's weak axes; not acting on them is the most common onboarding gap. | Phase 2's targeted-development section is mandatory when any axis scored "borderline" at hire. |
| Treating "success criteria" as aspirational | If the 90-day criteria are not measurable, the hiring manager and hire will disagree on performance at day 91. | Step 3's success criteria are observable artifacts (merged tests, written documents, peer feedback), not feelings. |
| Over-loading phase 1 | New hires cannot absorb toolchain, domain, team norms, and first contribution simultaneously. | Phase 1's milestones are sequenced: access and environment first, first contribution second, ceremonies third. Defer strategy discussions to phase 2. |
| Closing the mentor relationship before day 90 | Phase-3 mentoring shifts to consulting cadence (bi-weekly), not zero. Early closure removes the safety net for the hire's first strategy-ownership attempt. | Mentor cadence is explicit per phase; the formal relationship closes only at the day-90 review. |
| Re-running the onboarding plan as a performance plan | This plan covers the ramp to independent contribution, not ongoing performance management. | If the hire meets the day-90 criteria, transition to the team's standard career-ladder process. If they do not, that is a separate conversation outside this skill's scope. |

## Limitations

- **The plan assumes a team that has run `hiring-rubric-author`.** Without per-axis rubric scores, the targeted-development section of phase 2 defaults to generic guidance and loses its main differentiation from a generic onboarding checklist.
- **Domain-specific ramp times vary.** In regulated industries (healthcare, finance), environment access and compliance training can extend phase 1 by 2-4 weeks. Flag this assumption and adjust milestones accordingly.
- **Mentor availability is a hard dependency.** The phase-1 daily check-in and phase-2 PR review cadence require a named mentor. If no dedicated QA mentor is available, the plan should substitute a senior engineer and flag the capability gap.
- **The ISTQB self-study milestones are optional enrichment.** The CTFL Foundation Level syllabus (https://astqb.org/certifications/foundation-level-certification/) covers test fundamentals, static testing, test analysis and design, test activities, and test tools. For hires who are already certified, replace these milestones with domain-specific reading or toolchain deep-dives.
- **No fairness review.** The plan does not audit its success criteria for differential treatment across protected classes - that is the team's HR review (out of marketplace scope).

## Hand-off targets

- **Author the upstream question bank** - [`interview-question-author`](../interview-question-author/SKILL.md).
- **Author the upstream rubric** - [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md).
- **Calibrate interviewers** - [`calibration-guide-author`](../calibration-guide-author/SKILL.md).
- **Ongoing career development beyond day 90** - team's career ladder and performance management process (out of marketplace scope).

## References

- Michael Watkins, *The First 90 Days* (Harvard Business Review Press, 2003 / 2013) - the foundational 90-day structured-transition framework. The learn / integrate / contribute phase arc follows Watkins' "orienting - learning - acting" progression.
- Notion, "30-60-90 day plan" - three-phase framework description (learn / integrate / lead): https://www.notion.com/blog/30-60-90-day-plan
- Wikipedia, "Onboarding" - organizational socialization definition and four adjustment dimensions (role clarity, self-efficacy, social acceptance, organizational culture knowledge): https://en.wikipedia.org/wiki/Onboarding
- ISTQB Certified Tester Foundation Level v4.0 syllabus (ASTQB mirror) - competency chapters cited for self-study milestones (Ch. 1: Fundamentals; Ch. 2: Test Activities and Roles; Ch. 3: Static Testing; Ch. 4: Test Analysis and Design; Ch. 5: Managing Test Activities; Ch. 6: Test Tools): https://astqb.org/certifications/foundation-level-certification/
- PractiTest 2026 State of Testing Report - test strategy underdevelopment (40% gap) and the strategy-vs-execution income premium (+10.6%) that motivates the phase-3 strategy-ownership milestones: https://www.practitest.com/state-of-testing/
- [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md) - the upstream skill whose six competency axes (test analysis and design, defect lifecycle, test code conventions, tooling depth, communication, domain reasoning) are the target axes for this plan's per-phase competency tables.
- [`calibration-guide-author`](../calibration-guide-author/SKILL.md) - the calibration guide that closes the interview loop; the onboarding plan picks up where the calibration guide ends (post-offer-acceptance).
