---
name: career-ladder-author
description: "Build-an-X workflow that designs a QA career ladder - parallel individual-contributor and management tracks, per-level criteria across consistent axes, and observable promotion evidence per level - modeled on public engineering career frameworks (the Dropbox Engineering Career Framework, which includes Quality Engineer and SDET roles) and the career-development guidance in Camille Fournier's The Manager's Path (ISBN 978-1491973899). Distinct from `skill-matrix-author` (a sibling that maps the team's capability today; the ladder defines what each level looks like over a career), from `hiring-rubric-author` in qa-hiring (scores external candidates against one role, not progression across levels), and from `performance-feedback-author` (a sibling producing feedback on one person's recent work; the ladder is the structure that feedback points at). Use when a QA org needs leveling criteria - before promotion season, during compensation banding, or when senior testers ask what comes next besides management."
rating: 23
d6: 4
keywords: ["career-ladder", "career-framework", "qa-levels", "promotion", "ic-track", "management-track", "leveling"]
---

# career-ladder-author

## Overview

Without a written ladder, promotions ride on tenure and advocacy, and the answer to "what do I need to do to get promoted?" changes per manager. A career ladder fixes that by defining, per level, the expected scope and the observable evidence that someone already operates at it.

The reference shape comes from public engineering frameworks. The [Dropbox Engineering Career Framework](https://dropbox.github.io/dbx-career-framework/) (fetched 2026-06-10) defines an IC track (IC1 - IC7) and a management track (M3 - M7), explicitly includes **Quality Engineer** and **SDET** among its IC roles, evaluates each level on the pillars **Results, Direction, Talent, Culture, Craft**, and states that "Level Expectations define the scope, collaborative reach, and levers for impact at every level." Dozens of other public frameworks (GitLab, Spotify, Square, Etsy) are indexed at [progression.fyi](https://progression.fyi/) (fetched 2026-06-10), which collects 75 public and open-source career frameworks; study 2 - 3 before drafting, then adapt to QA-specific craft.

For the management track and the dual-ladder split, the canonical practitioner reference is Camille Fournier, *The Manager's Path* (O'Reilly, 2017, ISBN 978-1491973899), whose "Managing People" chapter treats career cultivation ("Cultivating Careers") as a distinct management duty rather than a side effect of reviews.

## When to use

- A QA org above ~5 testers has no written leveling criteria, or has criteria that exist only in the head of one manager.
- Promotion season exposes inconsistency: two testers with similar work are leveled differently across teams.
- Senior ICs are leaving or drifting toward management because the IC track visibly tops out.
- Compensation banding requires defensible level definitions.

Do **not** use this skill to:

- Decide one specific person's promotion - the ladder is the standard; the case is built from evidence via [`performance-feedback-author`](../performance-feedback-author/SKILL.md).
- Map what the team can do today - that is [`skill-matrix-author`](../skill-matrix-author/SKILL.md).
- Define a single role for hiring - that is [`qa-jd-author`](../../../qa-hiring/skills/qa-jd-author/SKILL.md) in qa-hiring.

## Step 1 - Capture the inputs

| Input | Notes |
|---|---|
| **Org size and shape** | Number of QA ICs, existing titles, whether QA reports into engineering or stands alone |
| **Role families** | Which QA roles the ladder must cover: manual/exploratory QA, automation engineer, SDET, and whether they share one ladder or get role-specific craft criteria |
| **Adjacent ladders** | The engineering ladder, if one exists; QA levels should be calibration-equivalent to engineering levels, or transfer and compensation break |
| **2 - 3 reference frameworks** | Fetched from [progression.fyi](https://progression.fyi/) or directly (e.g., [Dropbox](https://dropbox.github.io/dbx-career-framework/)); note what you adopt and what you reject |

## Step 2 - Fix the track structure

Decide three structural facts before writing any criteria:

1. **Two parallel tracks.** An IC track and a management track, with the split point and the equivalences stated (Dropbox: IC track to IC7, management entering at M3, both framed in the same level-expectation language - [dbx-career-framework](https://dropbox.github.io/dbx-career-framework/)). The dual ladder exists so that management is a role change, not the only raise; *The Manager's Path* (ISBN 978-1491973899) makes the same point from the other side: management is a distinct skill set to be learned, not a seniority reward.
2. **Level count.** Small orgs: 4 - 5 IC levels (junior, mid, senior, staff, principal). Do not copy a 7-level framework into a 12-person org; empty levels invite title inflation.
3. **Axes held constant across levels.** Pick 4 - 5 axes and define every level on the same axes, so adjacent levels differ by scope rather than by category. The Dropbox pillar set (Results, Direction, Talent, Culture, Craft) adapts well to QA with Craft expanded into QA-specific terms (test strategy, automation architecture, quality advocacy).

## Step 3 - Write per-level criteria with observable promotion evidence

Each level gets: a scope sentence, per-axis criteria, and an **evidence list** stating what an existing-at-this-level person has already done. Promotion is recognition of demonstrated scope, not potential. Worked example for one mid-ladder level:

```markdown
## QA-IC3 - Senior QA Engineer

**Scope:** Owns quality for a product area end to end; trusted to make test-approach
decisions inside that area without review.

| Axis | Expectation |
|---|---|
| Results | Ships the test approach for area-sized features; escapes in the owned area trend down or stay at the team floor |
| Direction | Writes the test-strategy section for their area; flags risk trade-offs to the lead before they become escapes |
| Talent | Onboards new testers onto the area; gives review feedback that changes what others ship |
| Culture | Raises quality concerns outside their lane through the right channel, with evidence |
| Craft | Designs tests across at least two test levels; automation contributions reviewed without rework loops |

**Observable promotion evidence (from work already done at IC2):**
- Authored the test approach for >=2 area-sized deliveries, including one with a
  documented risk trade-off the team followed.
- A defect-escape or incident retro where their analysis changed team practice.
- Review comments on others' test code that produced concrete changes (linkable PRs).
- Onboarded >=1 tester onto the area, with the onboardee shipping independently after.

**Explicitly not evidence:** time in level; volume of test cases executed;
certifications alone; being the only person who knows a system (that is a
bus-factor problem, not seniority).
```

The "not evidence" block per level is what keeps the ladder honest at promotion time.

## Step 4 - Write the management track as a role change

Management levels (QA-M1 lead, QA-M2 manager, QA-M3 head/director or per the org's grid) get the same axis treatment, with Craft partially replaced by people and process responsibilities: hiring (hand off to the qa-hiring chain), 1:1s and growth ([`tester-one-on-one-planner`](../tester-one-on-one-planner/SKILL.md)), feedback and reviews ([`performance-feedback-author`](../performance-feedback-author/SKILL.md)), capability planning ([`skill-matrix-author`](../skill-matrix-author/SKILL.md)). *The Manager's Path* (ISBN 978-1491973899) sequences these duties chapter by chapter (mentoring, then tech lead, then managing people, then managing a team) and is the calibration reference for what each management level actually does day to day.

State the transfer rule explicitly: moving IC->M or M->IC at equivalent level is a lateral move, not a promotion or demotion. Frameworks that omit this quietly re-create the management-only ceiling.

## Step 5 - Document the anti-patterns the ladder forbids

Ship the ladder with its failure modes named, so calibration meetings can cite them:

| Anti-pattern | Why it fails | Ladder counter-rule |
|---|---|---|
| Tenure-based promotion | Years in seat measure exposure, not scope; it levels the patient, not the capable | Evidence lists contain artifacts only; time-in-level appears in every "not evidence" block |
| Promotion as retention counter-offer | Levels the loudest resignation threat; corrodes every honest case | Promotions only in calibration cycles, against the written evidence list |
| Management as the only senior path | Loses the best ICs to other orgs or converts them into reluctant managers | Dual track with stated IC ceiling >= management ceiling (Dropbox runs IC to IC7 vs M to M7 - [dbx-career-framework](https://dropbox.github.io/dbx-career-framework/)) |
| Hero-based leveling | Rewards being the single point of failure | "Not evidence" blocks exclude sole-keeper-of-knowledge; Talent axis rewards spreading it |
| Criteria written as adjectives ("strong", "excellent") | Unfalsifiable; calibration becomes adjective arbitration | Every criterion phrased as an observable with a linkable artifact |
| Copying a big-tech ladder verbatim | A 7-level framework in a 10-person org creates empty levels and inflation | Step 2 sizes the level count to the org |

## Anti-patterns (of authoring the ladder itself)

- **Authoring without engineering-ladder alignment.** If QA-IC3 and ENG-IC3 are not calibration-equivalent, transfers and pay bands break; align the grids before publishing.
- **Publishing without a calibration process.** A ladder without a cross-team calibration meeting reverts to per-manager interpretation within two cycles.
- **Treating the ladder as immutable.** Revisit yearly; role families change (e.g., an SDET track may need to split out as automation scope grows).

## Limitations

- **Compensation mapping is out of scope.** The ladder defines levels; attaching salary bands is a compensation exercise with market data this skill does not carry.
- **Public frameworks are inputs, not authority.** Dropbox's pillars fit Dropbox; the fetched frameworks ground the *shape*, while the criteria content must come from the org's own QA work.
- **Small-org floor.** Below ~5 testers a written ladder is mostly ceremony; a lightweight level note per person plus the skill matrix is usually enough.
- **Book guidance is uncited-by-page.** *The Manager's Path* is cited by ISBN as a management framework; teams wanting verbatim guidance should read the "Managing People" and "Managing a Team" chapters directly.

## Hand-off targets

- **Measure today's capability against the new levels** → [`skill-matrix-author`](../skill-matrix-author/SKILL.md).
- **Run the growth conversations the ladder enables** → [`tester-one-on-one-planner`](../tester-one-on-one-planner/SKILL.md).
- **Build a promotion case from evidence** → [`performance-feedback-author`](../performance-feedback-author/SKILL.md).
- **Hire into a level** → [`qa-jd-author`](../../../qa-hiring/skills/qa-jd-author/SKILL.md) and the qa-hiring structured-interview chain.

## References

- Dropbox Engineering Career Framework - IC1 - IC7 and M3 - M7 tracks, Results/Direction/Talent/Culture/Craft pillars, Quality Engineer and SDET role coverage: https://dropbox.github.io/dbx-career-framework/ (fetched 2026-06-10).
- progression.fyi - index of 75 public and open-source career frameworks (GitLab, Spotify, Square, Etsy, and others) for Step 1 reference selection: https://progression.fyi/ (fetched 2026-06-10).
- Camille Fournier, *The Manager's Path: A Guide for Tech Leaders Navigating Growth and Change*, O'Reilly 2017, ISBN 978-1491973899 - management-track duties, dual-ladder rationale, "Cultivating Careers".
- [`skill-matrix-author`](../skill-matrix-author/SKILL.md), [`tester-one-on-one-planner`](../tester-one-on-one-planner/SKILL.md), [`performance-feedback-author`](../performance-feedback-author/SKILL.md) - sibling skills this ladder composes with.
