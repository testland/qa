---
name: interviewer-calibration-guide-author
description: "Build-an-X workflow that produces an interviewer calibration guide for a QA hiring loop - takes the question bank and rubric (from sibling skills `interview-question-author` and `hiring-rubric-author`) plus 2-5 sample candidate transcripts/responses, and emits gold-standard model answers, common pitfalls, score-anchor examples per question, and a calibration-session script for the panel. Distinct from the question and rubric skills (which produce the questions and the scoring scaffold); this skill produces the **demonstration material** that brings two interviewers' scores into agreement. Use after the rubric exists and before the first real candidate - the calibration guide is what closes the inter-rater-reliability gap that the rubric alone cannot."
---

# interviewer-calibration-guide-author

## Overview

A rubric describes how to score; a calibration guide demonstrates *what* a score looks like. The structured-interview research is consistent that anchor descriptions reduce inter-rater noise but do not eliminate it - interviewers still drift on edge cases without **worked examples** of the same question scored across the whole 1-4 range. This skill produces those worked examples.

The calibration guide is the third leg of the structured-interview tripod:
- [`interview-question-author`](../interview-question-author/SKILL.md) - *what we ask*
- [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md) - *how to score*
- this skill - *what each score looks like in practice*

Without all three, an interview loop is structurally incomplete - the team will produce an inconsistent signal regardless of how good the questions and rubric are individually.

## When to use

- The question bank and rubric exist; the team has scheduled a calibration session for the panel before the first real interview.
- Two interviewers historically score the same recorded candidate differently (the "we never agree on borderline" complaint); the calibration guide is the remedy.
- Onboarding a new interviewer to an existing loop - the guide is a 60-minute read that brings them to score-agreement with the existing panel.

Do **not** use this skill to:

- Author questions or rubrics - those are the sibling skills.
- Replace a calibration session. The guide is the *material*; running the panel through it together is still required for inter-rater alignment.
- Disclose to candidates. The gold-standard answers are panel-internal; sharing them with candidates pollutes the signal.

## Step 1 - Capture the inputs

Required:

| Input | Notes |
|---|---|
| **Question bank** | The output of `interview-question-author` |
| **Rubric** | The output of `hiring-rubric-author` - defines the 4-level anchors per dimension |
| **Sample transcripts** | 2 - 5 anonymised candidate transcripts (or recordings the panel has scored). The minimum is 2 (one strong, one weak); 5 is plenty. The skill halts with `INSUFFICIENT_TRANSCRIPTS` below 2 - calibration without real examples is theoretical, not load-bearing. |
| **Panel size** | Number of interviewers who will calibrate; informs the calibration-session timing |

If the team is launching a new role with no prior transcripts, use **synthesised transcripts** (the skill emits transcripts that demonstrate each score level) but flag explicitly that the panel must replace them with real anonymised transcripts after the first 5 candidates.

## Step 2 - Per-question gold-standard answers

For each question in the bank, the calibration guide emits **four worked answers** demonstrating each rubric level (1 = no hire, 2 = borderline, 3 = hire, 4 = strong hire):

```markdown
### Q3 - Behavioral (STAR): late-defect catch - gold standards

#### Score 1 - no hire

> "Yeah, last release we caught a really bad bug right before launch. The whole team was upset. We were lucky we caught it. After that I'm just always more careful."

**Why score 1:** No technique named; no STAR structure (S/T/A/R undifferentiated); attributes the catch to luck and emotional response rather than process. Anchor: "Cannot articulate a partition / boundary / decision-table technique" - matches.

#### Score 2 - borderline

> "Last release I caught a defect where the cart total wrapped around at $99.99 to a negative number. I added a boundary test for the max-price limit. It was fine after that."

**Why score 2:** Names a technique (boundary value analysis, implicitly); STAR is partial - Situation and Action are clear; Task is implicit ("I was the QA lead"); Result is "it was fine after that" - no measurable outcome, no retrospective learning. Probe for the Task and Result; if the candidate fills both, score moves to 3.

**Probe to use:** "What was your specific role at that point? And how did the team know the fix worked beyond that one test?"

#### Score 3 - hire

> "On the v3.4.0 release we caught a defect where the cart total wrapped around at $99.99 to a negative number. As the QA lead for the release, I was running the standard regression suite when I noticed our test cases all used round-dollar amounts - $50, $100. I added boundary-value tests at the upper limit (one cent under, exactly at, one cent over) and the bug reproduced at exactly $99.99. We fixed the cents-precision rounding in the price-display component, added the boundary tests to the regression suite, and updated our test-data conventions to use Faker's `randomFloat({ precision: 0.01 })` rather than round numbers."

**Why score 3:** Specific technique (boundary value analysis) named **and** applied. STAR complete: situation (v3.4.0), task (QA lead, running regression), specific action (noticed pattern, added boundary tests), measurable result + retro learning (fix shipped, regression added, conventions updated). Matches the anchor: "Identifies the specific technique that caught the defect... STAR complete... measurable result + retro learning."

#### Score 4 - strong hire

> "[Same situation as score 3, plus:] After we shipped the fix, I noticed our test-data conventions had no rule against round-number-only test data. I authored a one-page conventions update that mandated Faker boundary inputs for any numeric field with a documented constraint, and got the rest of the QA team to sign off. Over the following two releases, we caught two more rounding-precision bugs at the same boundary class - proving the convention change was load-bearing, not just paperwork."

**Why score 4:** Generalises beyond the specific defect to a systemic process change, ties the change to a measurable downstream outcome (two more bugs caught), and documents organisational influence (got the team to sign off). Matches the anchor: "Identifies a systemic gap... and ties the change to a measurable downstream improvement."
```

The four-level demonstration is the load-bearing artifact. An interviewer who reads all four can grade ambiguous transcripts by asking *which of these does this candidate's answer most resemble* - concrete comparison rather than abstract scoring.

## Step 3 - Common pitfalls

For each question, the guide emits a "common pitfalls" section - the typical mistakes interviewers make scoring this question:

```markdown
### Q3 - common interviewer pitfalls

| Pitfall | Why it produces noise | Correction |
|---|---|---|
| Scoring on tone of voice / "confidence" | Tone is interviewer-specific; the same candidate scored differently by interviewer A and B on tone alone. | Score on what the candidate said, not how. |
| Awarding score 3 because the candidate "is clearly senior" | Halo effect; the question's anchor doesn't mention seniority. | Strict adherence to the anchor's behavioural description. |
| Probing too aggressively after a partial answer | Different interviewers probe to different depths; a thoroughly-probed candidate looks stronger than a lightly-probed one with the same competence. | Use only the pre-authored probes from the question bank; one probe per missing component, no more. |
| Stopping at score 3 because "I never give 4s" | Anchor calibration drift; the rubric's level 4 exists for a reason. | If the candidate matches the level-4 anchor, give level 4; review your prior interviews for under-scoring. |
| Awarding score 4 because "the answer was great" without checking the systemic-gap and measurable-outcome anchors | Halo effect on level 4. | Level 4 requires both anchor sub-conditions (systemic + measurable); level 3 is the default for excellent answers that don't cross both. |
```

## Step 4 - Calibration-session script

The guide's last section is the script for the panel's calibration meeting - typically 90 minutes for a 6-question loop. The script:

1. **Pre-read** (the panel reads the guide's gold-standards individually, ~30 minutes before the meeting).
2. **Per-question discussion** (~10 minutes per question): the panel scores the same anonymised real transcript independently, reveals scores, discusses any disagreement until the panel converges on a score.
3. **Anchor refinement** (~10 minutes): if the panel discovers the rubric's anchor is ambiguous, edit the rubric (and document the change). Calibration sessions are the canonical moment to refine the rubric.
4. **Pitfall review** (~10 minutes): the panel walks through Step 3's common pitfalls; each interviewer flags one they recognise from their own prior interviews.

The script is **mandatory** before the first real candidate. Per the structured-interview research, calibration is the dominant variable in inter-rater agreement - more important than rubric quality alone.

## Step 5 - Emit the guide

The output is a single markdown document with:

1. **Header**: role, seniority, source question bank + rubric references, panel size, recommended session length.
2. **Per-question gold standards** (Step 2 - four worked answers per question).
3. **Per-question pitfalls** (Step 3 - common interviewer mistakes).
4. **Calibration-session script** (Step 4 - agenda + timing).
5. **Anchor-drift log** (initially empty; the panel records every rubric anchor that was tightened during the session, so future hiring rounds inherit the refinement).
6. **Hand-off block**:

```markdown
## HAND-OFF - required next steps

1. Run the calibration session per Step 4. Do **not** schedule real candidates before this session is complete.
2. After the first 5 real candidates, run a retro: which questions discriminated, which scored everyone at 3, which had inter-rater disagreement above the team's tolerance. Update the rubric and / or this guide accordingly.
3. Replace any synthesised transcripts in this guide with real anonymised transcripts from the first 5 candidates - synthesised transcripts are starter-material only.
4. Re-author this guide whenever the role description, seniority, or rubric change.
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Sharing gold-standard answers with candidates | Pollutes the signal; the candidate parrots the answer back. | Panel-internal only; tag the file accordingly. |
| Skipping the calibration session because "we'll just use the rubric" | Inter-rater agreement does not appear without practice; the rubric alone is insufficient. | Step 4 calibration session is mandatory. |
| Calibrating on synthesised transcripts only | The transcripts are the skill's best-guess; real candidates score in unpredictable shapes. | Replace synthesised with real anonymised transcripts after the first 5 candidates. |
| Authoring the guide without the rubric | Anchors drift from the rubric's level definitions. | Step 1 hard-requires the rubric. |
| Locking the guide for the whole hiring round with no anchor-drift log | Anchor refinements during real interviews are lost; the guide becomes outdated mid-round. | Step 5's anchor-drift log is part of the artifact. |
| Treating the calibration session as a one-time event | Calibration drifts over months; new interviewers join. | Re-calibrate per hiring round, or at least quarterly. |

## Limitations

- **Synthesised transcripts are educated guesses, not real data.** They demonstrate the rubric's intent but do not reflect actual candidate variance. Replace ASAP.
- **Calibration is bounded by panel discipline.** A panel that nods through the script without genuinely scoring transcripts together will not achieve inter-rater agreement.
- **The guide is panel-internal and should not leave the hiring loop.** Storing it in the team's wiki is fine; sending it to candidates is not.
- **Anchor refinement is a living artifact.** The rubric and this guide co-evolve; the team's wiki should hold the latest version, and prior versions should be archived per hiring round.
- **No fairness / bias audit.** The skill does not check the gold-standard answers for class bias - that is the team's HR / legal review.

## Hand-off targets

- **Author the upstream questions** → [`interview-question-author`](../interview-question-author/SKILL.md).
- **Author the upstream rubric** → [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md).
- **Bias / fairness audit of the gold-standard answers** → team's HR / legal review.
- **Track the inter-rater agreement over the hiring round** → custom analytics; not covered here.

## References

- Structured interview research - Levashina et al. 2014 ([*Personnel Psychology*](https://en.wikipedia.org/wiki/Structured_interview)) on the validity uplift from calibrated structured interviews; the methodological basis for this skill's "gold-standards + calibration session" defaults.
- STAR behavioral interviewing method - Situation / Task / Action / Result framework, the structure of the gold-standard answers for behavioural questions: https://en.wikipedia.org/wiki/Situation,_task,_action,_result
- ISTQB glossary - the canonical QA vocabulary the gold-standard answers reference (defect, defect-density, escaped-defect, test-design-technique, etc.): https://glossary.istqb.org/
- Bloom's taxonomy - the K1 - K4 cognitive-difficulty levels used to ensure gold-standard answers match the question's intended depth: https://en.wikipedia.org/wiki/Bloom%27s_taxonomy
- PractiTest 2026 State of Testing Report - hiring rubric / interviewer calibration cited as a high-adoption, low-risk AI use case for QA managers: https://www.practitest.com/state-of-testing/
- [`interview-question-author`](../interview-question-author/SKILL.md), [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md) - the two upstream sibling skills that produce the questions and the rubric this guide demonstrates.
