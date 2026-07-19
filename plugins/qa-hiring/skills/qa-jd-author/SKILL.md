---
name: qa-jd-author
description: "Build-an-X workflow that authors a QA job description for a given role and seniority - responsibilities drawn from the ISTQB CTFL v4.0 split between the testing role (test analysis, design, implementation, execution) and the test management role (planning, monitoring and control, completion), a must-have versus nice-to-have skills split, and the screening signals a recruiter can apply to applications. The competency vocabulary matches `hiring-rubric-author`, so the JD a candidate reads and the rubric they are scored on describe the same role. This is the artifact that opens the role and attracts applicants - not the interview questions, not the scoring rubric, and not the post-hire ramp plan. Use when opening a QA / SDET / automation / test-lead / quality-manager requisition, before anything is posted - the JD is the upstream-most artifact of the hiring chain."
metadata:
  keywords: "job-description, qa-hiring, recruiting, istqb, screening, requisition, jd"
---

# qa-jd-author

## Overview

The JD is the first scoring instrument in the hiring chain, applied by candidates to themselves: a vague posting screens nobody, and an everything-list screens out exactly the people the team wants. This skill produces a JD whose responsibilities come from the role's actual test activities and whose skills section uses the same competency vocabulary the downstream [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md) rubric will score - so the role a candidate applies to is the role the panel evaluates.

Two grounding sources. For **what the role does**: ISTQB CTFL v4.0 section 1.4.5 defines two principal roles in testing - the **testing role**, which "takes overall responsibility for the engineering (technical) aspect of testing" and is "mainly focused on the activities of test analysis, test design, test implementation and test execution", and the **test management role**, which "takes overall responsibility for the test process, test team and leadership of the test activities" and is "mainly focused on the activities of test planning, test monitoring and control and test completion". The same section notes one person may take on both roles at the same time ([ISTQB CTFL Syllabus v4.0, §1.4.5](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf); syllabus text verified 2026-06-10 from the published PDF). For **how the document reads**: Workable's JD guidance - clear, standard job titles (creative titles like "Rockstar Engineer" read as "unrealistic and potentially discriminatory"), 300 - 660 words total, bulleted duties that show a typical workday, and requirements split into must-have versus nice-to-have ([Workable, "How to write a good job description"](https://resources.workable.com/tutorial/how-to-write-a-good-job-description), fetched 2026-06-10).

## When to use

- A QA requisition is approved (manual QA / automation engineer / SDET / test lead / quality manager, junior through staff+) and nothing is written yet.
- An existing posting attracts the wrong applicants: heavy volume with the wrong skills, or near-zero volume on a reasonable role.
- A capability-gap analysis recommended hiring and the gap definition needs translating into a posting.

Do **not** use this skill to:

- Author interview questions - that is [`interview-question-author`](../interview-question-author/SKILL.md), the next artifact in the chain once the JD is posted.
- Score candidates - that is [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md); this skill feeds it the competency list.
- Define internal level criteria - that is `career-ladder-author` in qa-team-management; the JD describes one role externally, the ladder describes progression internally. Where both exist they must agree.

## Step 1 - Capture the inputs

| Input | Notes |
|---|---|
| **Role + seniority** | Same axis the sibling skills use: manual QA / automation / SDET / test lead / quality manager × junior / mid / senior / staff+ |
| **Role balance** | Where this role sits between CTFL's testing role and test management role; a senior SDET is nearly all testing role, a test lead carries a documented share of the management role ([CTFL §1.4.5](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)) |
| **Team context** | Stack and toolchain, domain, test levels in scope, why the role is open (a team capability-gap report is the ideal version of this input) |
| **Constraints** | Location/remote, compensation-disclosure rules in the posting jurisdictions, non-negotiables |

## Step 2 - Derive responsibilities from the role's test activities

Write 5 - 8 responsibility bullets, each traceable to a test activity, phrased as a typical-workday action (Workable's guidance: duties should show what a normal day looks like, not an aspirational mission). Map per role balance:

- **Testing-role bullets** draw on test analysis, test design, test implementation, test execution ([CTFL §1.4.5](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)): "design and automate API-level regression tests for the payments services", "run and extend exploratory charters on new checkout features".
- **Test-management bullets** draw on test planning, monitoring and control, completion: "own the test strategy section for your product area", "report quality status to engineering leadership each sprint".

A role that is 100% one kind needs no bullets from the other; a mixed role states the split rather than hiding it ("~70% hands-on automation, ~30% process ownership").

## Step 3 - Split skills into must-have vs nice-to-have

The split is the JD's main screening mechanism (Workable: be upfront about non-negotiables; separate must-have from nice-to-have so candidates self-assess accurately). Rules:

- **Must-haves: 4 - 6 items maximum**, each one the team would genuinely reject an otherwise-strong candidate for lacking. Use the competency dimensions from [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md) Step 2 for the role (e.g., for automation: test analysis and design, test code conventions, tooling depth, communication) so JD and rubric stay one vocabulary.
- **Nice-to-haves: 3 - 5 items**, explicitly labeled as such.
- Include the generic tester skills only when they will be screened for: CTFL 1.5.1 lists testing knowledge, thoroughness, curiosity, attention to detail, being methodical, and communication among skills particularly relevant for testers - but as JD boilerplate they screen nothing; tie them to an observable ("bug reports that developers can reproduce first try") or leave them out.
- Certifications (ISTQB included) are nice-to-have evidence of knowledge, not must-have proxies for skill, unless a client or regulator mandates them.

## Step 4 - Define screening signals for the recruiter

The JD ships with a one-page screening note (internal, not posted): for each must-have, what in a CV or portfolio counts as signal vs noise. Example for "tooling depth, Playwright":

| Signal | Noise |
|---|---|
| Public repo or described project with Playwright specs they authored | "Playwright" in a skills word-cloud |
| Describes flake-debugging or CI-stabilization work | Lists every test tool released since 2015 |
| Automation framework decisions they can own ("migrated from X because...") | Certification list with no applied work |

This note is what keeps the recruiter's screen consistent with the panel's rubric - the same chain-of-custody idea the structured-interview triple applies after the screen.

## Step 5 - Assemble and length-check the JD

Order: title, one-paragraph role summary (which includes why the role is open), responsibilities, must-haves, nice-to-haves, team and stack, process and timeline, compensation per jurisdiction rules. Target 300 - 660 words total per Workable's guidance; bulleted lists for mobile readability. Worked example (condensed):

```markdown
# Senior QA Automation Engineer - Payments

We run weekly releases for a payments product used by 40k merchants. This role
is open because our capability review found one engineer covering performance
testing for the whole group; you will broaden and own that coverage. ~80%
hands-on engineering, ~20% strategy input for your area.

## What you will do
- Design and automate regression tests for payment-retry and reconciliation flows
  (TypeScript + Playwright, k6 for load profiles).
- Extend the CI quality gates: flake quarantine, suite budget, pass-rate reporting.
- Run risk-based test analysis on new payment features with the product trio.
- Coach two mid-level engineers on test design through review.

## Must have
- Test analysis and design: you can derive tests from risks and requirements,
  not only from acceptance criteria handed to you.
- Production-grade test code in TypeScript or a near language; you have owned
  a suite others contribute to.
- Load or performance testing on at least one real system (k6, Gatling, or similar).
- Written communication: bug reports and strategy notes that stand alone.

## Nice to have
- Payments or other regulated-domain background; ISTQB CTAL-TA; CI ownership
  (GitHub Actions); accessibility testing exposure.
```

(~420 words in full form, inside the 300 - 660 band.)

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Unicorn JD (every tool, every level, "QA ninja") | Screens out honest strong candidates; Workable flags creative titles as unrealistic and potentially discriminatory | Standard title; 4 - 6 must-haves with the Step 3 reject-test |
| Years-of-experience as must-haves | Years measure exposure, not competence, and import bias | Phrase must-haves as capabilities with observable evidence |
| JD vocabulary differing from the rubric | Candidate applies to one role, gets scored on another; debriefs derail | Step 3 reuses `hiring-rubric-author` competency dimensions |
| Responsibilities copied from a template | The workday described matches no actual workday; early attrition follows | Step 2 derives bullets from the team's real test activities |
| Hiding the management share of a lead role | Candidates discover the meeting load after signing | State the split explicitly (Step 2) |
| Posting with no screening note | Recruiter invents their own filter; the funnel disconnects from the rubric | Step 4 note ships with the JD |

## Limitations

- **No compensation benchmarking.** The skill leaves salary bands to the org's compensation source; it only enforces that disclosure rules per jurisdiction are respected in the posting.
- **No legal review.** Employment-law phrasing (at-will clauses, accommodation language) varies by jurisdiction and is HR/legal's call.
- **Channel strategy out of scope.** Where to post and how to source is recruiting strategy; this skill produces the artifact, not the campaign.
- **The JD ages.** Re-derive from current team context per opening; a reposted two-year-old JD advertises a team that no longer exists.

## Hand-off targets

- **Next step in the chain** → [`interview-question-author`](../interview-question-author/SKILL.md) (question bank), then [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md) (scoring rubric), then [`calibration-guide-author`](../calibration-guide-author/SKILL.md) - the structured-interview triple this JD feeds.
- **After the hire** → [`onboarding-plan-author`](../onboarding-plan-author/SKILL.md).
- **If the role came from a capability gap** → a team capability-gap report supplies the "why this role is open" paragraph.

## References

- ISTQB CTFL Syllabus v4.0, section 1.4.5 "Roles in Testing" (testing role vs test management role definitions quoted in the Overview) and 1.5.1 "Generic Skills Required for Testing": https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf - syllabus text verified 2026-06-10 from the published v4.0 PDF (ISTQB resource CDN copy at https://d288qud2qgn4l3.cloudfront.net/media/resources/ISTQB_CTFL_Syllabus-v4.0.pdf).
- Workable, "How to write a good job description" - title guidance, 300 - 660 word target, bulleted typical-workday duties, must-have vs nice-to-have split: https://resources.workable.com/tutorial/how-to-write-a-good-job-description (fetched 2026-06-10).
- [`interview-question-author`](../interview-question-author/SKILL.md), [`hiring-rubric-author`](../hiring-rubric-author/SKILL.md), [`calibration-guide-author`](../calibration-guide-author/SKILL.md), [`onboarding-plan-author`](../onboarding-plan-author/SKILL.md) - the downstream hiring chain.
