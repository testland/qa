---
name: hiring-rubric-author
description: "Build-an-X workflow that produces a per-role QA hiring rubric - takes a role description (manual QA / SDET / automation engineer / test lead / quality manager) plus the question bank from `interview-question-author` and emits a competency-anchored scoring rubric with 4-level behavioral anchors (no-hire / borderline / hire / strong-hire) per competency. This produces the scoring scaffold only - not the questions themselves, and not the gold-standard model answers that demonstrate each score level. Use after the question bank exists and before the first interview is scheduled - the rubric is what brings interviewer scoring into agreement."
---

# hiring-rubric-author

## Overview

Without a rubric, two interviewers asking the same question produce different scores; the literature on [structured interviewing](https://en.wikipedia.org/wiki/Structured_interview) is clear that the *questions* alone are not sufficient - the scoring rubric is what converts them into a comparable signal. This skill produces the rubric half of the structured-interview pair.

Anchored rubrics outperform free-form scoring because the **anchor descriptions** at each level (no-hire / borderline / hire / strong-hire) constrain what each score means. An interviewer who reads "level 3: candidate explains the AAA pattern with a worked example and identifies one of: assertion strength, mocking pitfalls, or fixture coupling" cannot drift the score on tone or rapport - the anchor is concrete.

## When to use

- The team has authored a question bank via [`interview-question-author`](../interview-question-author/SKILL.md) and needs the matching rubric.
- An existing rubric is being recalibrated after a hiring round (the team's gold-standard answers have shifted as the role evolved).
- A team is adding a new competency dimension to an existing loop (e.g., adding "test data engineering" to an existing automation rubric).

Do **not** use this skill to:

- Author the questions - that is [`interview-question-author`](../interview-question-author/SKILL.md).
- Author the gold-standard model answers and common pitfalls - that is [`interviewer-calibration-guide-author`](../interviewer-calibration-guide-author/SKILL.md). The rubric scores; the calibration guide demonstrates.
- Score generic engineering / non-QA roles. The competency model is QA-specific.

## Step 1 - Capture the inputs

Required:

| Input | Notes |
|---|---|
| **Role + seniority** | Same as the upstream question bank - manual QA / SDET / automation / test lead / quality manager × junior / mid / senior / staff+ |
| **Question bank** | The output of [`interview-question-author`](../interview-question-author/SKILL.md). Each question's competency tag drives the rubric's competency-by-question matrix. |
| **Team's competency model** | Optional. If absent, defaults to the ISTQB-aligned default model in Step 2. |

If a question bank is not available (e.g., an ad-hoc loop, or an existing interview set that was never written down), the rubric defaults to authoring one anchor set per competency dimension rather than per (competency × question) cell, marks itself **provisional** in the header, and flags this assumption explicitly in the output. A provisional rubric must be re-run against the bank once it exists - competency-general anchors drift from the questions actually asked, which is the failure the Step 1 requirement exists to prevent.

## Step 2 - Pick the competency dimensions

A QA hiring rubric scores against 5 - 8 competency dimensions. The default set (drawn from [ISTQB Foundation Level v4.0](https://www.istqb.org/certifications/certified-tester-foundation-level) competencies and adapted to interviewable behaviour) per role:

### manual-qa-engineer / qa-automation-engineer

1. **Test analysis & design** - partitioning, boundary, decision-table reasoning per ISTQB technique.
2. **Defect lifecycle** - `defect` vs `failure` distinction; bug-report quality; reproducibility.
3. **Test code conventions** (automation only) - AAA structure, assertion strength, mocking discipline.
4. **Tooling depth** - fluency with the team's primary toolchain (Playwright / Cypress / Selenium / pytest / JUnit / etc.).
5. **Communication** - written bug reports; verbal hand-off to engineering.
6. **Domain reasoning** - applies QA techniques to the team's domain (fintech / healthcare / consumer mobile).

### sdet

1. Test analysis & design.
2. Test code conventions.
3. **Test framework / tool architecture** - how to extend the team's framework; CI integration; flake budget.
4. **Production-quality coding** - AAA, refactoring, naming, fixture cleanliness.
5. **System reasoning** - service boundaries; what to test at which layer.
6. **Communication & collaboration**.

### test-lead

1. **Test strategy authoring** - risk-based testing; the test pyramid as an *argument*, not a template.
2. **Stakeholder management** - engineering, product, support, leadership.
3. **Hiring & coaching of QA team members** - itself; the candidate has done this.
4. **Defect management at the team / cross-team layer**.
5. **Tooling & CI ownership**.
6. **Communication (written + verbal, exec-level)**.

### quality-manager

1. **Quality strategy across releases / quarters**.
2. **Risk-based prioritisation** - data-informed decisions with traceability.
3. **Stakeholder communication, exec-level**.
4. **Hiring & team development**.
5. **Process / methodology fluency** - agile, BDD, shift-left, shift-right, when each applies.
6. **Defect / escape management at the org layer**.
7. **Compliance / regulated-industry framing** (if applicable).

The skill emits the dimensions selected for the role; the team can add or remove dimensions before locking the rubric.

## Step 3 - Author the 4-level anchors per dimension

For each (competency × question) cell, the rubric needs four behavioural anchors. The anchor describes **what the candidate said or did**, not **what the interviewer felt** - this is the load-bearing principle that reduces interviewer noise.

```markdown
### Test analysis & design - Q3 (Behavioral, STAR: late-defect catch)

| Score | Anchor (what the candidate said / did) |
|---|---|
| **1 - no hire** | Cannot articulate a partition / boundary / decision-table technique. Describes the catch as "I just got lucky." Or attributes the catch to a tool ("the linter caught it"). |
| **2 - borderline** | Names one ISTQB technique correctly but cannot apply it to the catch they describe. STAR is partial: missing Result or missing the candidate's specific Action (says "we" throughout). |
| **3 - hire** | Identifies the specific technique that caught the defect (e.g., "we had no negative test for the empty-cart case - equivalence partitioning would have flagged it"). STAR complete: situation, task, the candidate's specific action, measurable result + retro learning. |
| **4 - strong hire** | Generalises beyond the specific defect: identifies a systemic gap (e.g., "we had no convention requiring a negative test per public method; I added that to our `test-code-conventions` doc"), and ties the change to a measurable downstream improvement. |

**Probe-trigger:** If the candidate scores 2 on STAR completeness, probe for the missing component; do not deduct further on the second pass.
**Time-budget impact:** A score of 4 typically takes 2 extra minutes; budget accordingly.
```

Each anchor is concrete enough that two interviewers reading the same transcript would arrive at the same score - that is the only test of the anchor's quality.

## Step 4 - Compute the role-level summary score

The rubric outputs a **per-dimension score** and a **summary recommendation**. The summary is not a simple average:

| Per-dimension scoring rule | Summary recommendation |
|---|---|
| All dimensions ≥ 3, ≥ 1 dimension at 4 | **Strong hire** |
| All dimensions ≥ 3 | **Hire** |
| 1 dimension at 2, all others ≥ 3 | **Borderline - debrief required** |
| ≥ 2 dimensions at 2, no 1s | **No hire - competency gap** |
| Any dimension at 1 | **No hire - fundamental gap** |

The summary refuses to average across competencies - a candidate weak in `defect lifecycle` and strong in `tooling depth` is not "average"; the role demands both. Per-dimension floors are the load-bearing constraint.

## Step 5 - Emit the rubric

The output is a single markdown document with:

1. **Header**: role, seniority, source question bank reference, competency dimensions, summary-rule table.
2. **Per-question scoring sections** (one per question in the bank, scoring against each competency the question targets - typically 1 - 2 competencies per question).
3. **Summary recommendation rules**.
4. **Hand-off block**:

```markdown
## HAND-OFF - required next steps

1. Pair with `interviewer-calibration-guide-author` to produce gold-standard model answers and common pitfalls per question - without those, the anchors here are aspirational.
2. Run a calibration interview (one panel scores the same recorded interview together) before the first real candidate. Per the structured-interview research, calibration is the dominant variable in inter-rater agreement.
3. Lock the rubric at the start of the hiring round; mid-round changes invalidate prior candidates' scores.
4. After the round, run a defect-trend-narrative-style retro on the rubric: which competencies discriminated; which were noise; which scored everyone at 3 (a sign the anchor is too generous).
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Free-text "1 - 5 score" with no anchors | The score is the interviewer's opinion, not a behavioural observation. | Step 3 anchors are mandatory; no anchorless dimensions. |
| Anchors that describe the interviewer's feeling ("I was impressed", "the candidate seemed confident") | Tone signals; not behaviour. Interviewer noise is the dominant source. | Anchors describe what the candidate **said or did** verbatim. |
| Averaging dimension scores into a summary | Hides the load-bearing competency gaps. | Step 4's per-dimension floor; no averages. |
| Using the same rubric across seniority levels | A senior candidate at "score 3" is mid-level performance for that role; the absolute number means different things. | Per-seniority anchors; junior-3 ≠ senior-3. |
| Rubrics with 10+ dimensions | Interviewer can't hold them all; scoring fragments. | Cap at 5 - 8 dimensions. |
| Rubric authored without the question bank | Anchors drift from the actual questions; scoring becomes generic. | Step 1 hard-requires the question bank as input. |
| "Cultural fit" as a dimension | Documented bias amplifier; legally fraught. | Use the team's Definition of Done / engineering values translated into behavioural anchors instead. |

## Limitations

- **The rubric is only as good as its anchors.** Vague anchors produce inter-rater drift; concrete behavioural anchors take time to author and refine.
- **Anchor-validation requires real candidate data.** Until the rubric has been used through 5 - 10 interviews, its anchors are theoretical. Plan a calibration interview before the first real candidate.
- **Rubrics drift over time.** A rubric authored in 2024 may anchor on tools that are no longer the team's default. Re-author per hiring round, or at least review.
- **No fairness audit.** The skill does not check the rubric for bias against protected classes - that is the team's HR / legal review.
- **Weighting is uniform per dimension.** Some teams want to weight `tooling depth` higher than `communication`; the skill emits unweighted scores and leaves weighting to the hiring manager. Custom weights can be applied post hoc to the per-dimension scores.

## Hand-off targets

- **Calibrate interviewers (gold-standard answers, common pitfalls)** → [`interviewer-calibration-guide-author`](../interviewer-calibration-guide-author/SKILL.md).
- **Author the question bank (upstream)** → [`interview-question-author`](../interview-question-author/SKILL.md).
- **Compliance review of the rubric** → team's legal / HR review.

## References

- ISTQB Certified Tester Foundation Level v4.0 syllabus - the competency model adapted into the default dimensions per role: https://www.istqb.org/certifications/certified-tester-foundation-level
- ISTQB glossary - defect / failure distinction (load-bearing for the `defect lifecycle` dimension): https://glossary.istqb.org/en_US/term/defect
- Structured interview research - Levashina et al. 2014 ([*Personnel Psychology*](https://en.wikipedia.org/wiki/Structured_interview)) on the validity uplift from structured rubrics + same questions / same order.
- STAR behavioral interviewing method - Situation / Task / Action / Result framework, used in the behavioural-question anchors: https://en.wikipedia.org/wiki/Situation,_task,_action,_result
- Bloom's taxonomy - K1 - K4 cognitive levels used to align the rubric's anchor depth with the question's intended difficulty: https://en.wikipedia.org/wiki/Bloom%27s_taxonomy
- PractiTest 2026 State of Testing Report - hiring rubric authoring named as a high-adoption, low-risk AI use case for QA managers: https://www.practitest.com/state-of-testing/
- [`interview-question-author`](../interview-question-author/SKILL.md), [`interviewer-calibration-guide-author`](../interviewer-calibration-guide-author/SKILL.md) - sibling skills that complete the structured-interview triple.
