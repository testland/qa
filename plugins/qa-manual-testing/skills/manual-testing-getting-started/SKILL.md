---
name: manual-testing-getting-started
description: "Orients a new tester to the qa-manual-testing plugin: explains the two testing modes (session-based exploratory and scripted manual), maps the recommended starting path through the plugin's agents and skills, and names the four heuristic references with guidance on when to reach for each. Use when a junior or new manual or exploratory tester does not know where to start in this plugin and needs a single entry-point that connects the pieces."
rating: 23
d6: 3
keywords: [onboarding, exploratory-testing, sbtm, scripted-testing, heuristics, manual-testing]
---

# manual-testing-getting-started
## What this plugin covers

This plugin covers two modes of human-driven testing. **Session-based exploratory testing**
(SBTM - Bach + Bach, 2000) is a framework in which a tester executes a focused, time-boxed
session (60-90 minutes) guided by a **charter** - a mission statement of the form
"Explore \<area\> with \<tools\> to discover \<information\>" - and records findings in a session
sheet that a lead can review and debrief; the framework turns ad-hoc clicking into a
measurable, chartered, and reviewable activity documented at
[satisfice.com/sbtm](https://www.satisfice.com/sbtm). **Scripted manual testing** follows
the opposite pattern: a pre-authored step-table or Gherkin script tells the tester exactly
what to do, what data to use, and what outcome to expect; the tester's job is execution
and observation, not design. Both modes belong in a mature testing strategy - exploratory
sessions surface unexpected bugs and learn the product; scripted tests give stakeholders
a repeatable, signed-off record of verified behaviour.

## Starting path: exploratory testing

If you want to run an exploratory session, follow this sequence:

1. **Write your charter with `charter-coach`.**
   Tell it the feature and the risk areas you care about. It returns a ready-to-execute
   mission card: a charter statement, scoped areas, applicable HICCUPPS-F oracles,
   SFDPOT elements to vary, and 1-3 tours to try. You do not need to know the heuristics
   in advance - charter-coach preloads them.

2. **Run the session using `exploratory-tours-reference` heuristics.**
   Open the skill during your session to pick a tour if you feel the exploration drifting.
   The seven canonical Whittaker tours (Feature, Money, Landmark, Intellectual, Bad-data,
   Configuration, Garbage collector's) each frame the session around a different class
   of bugs. Pick the tour your charter hints at or the one that matches the risk you are
   currently investigating.

3. **Debrief with `session-debrief-coach`.**
   After the session, paste your session sheet into session-debrief-coach. It checks every
   PROOF field (Past, Results, Outlook, Obstacles, Feelings) for completeness, flags a
   thin Feelings entry, detects a skewed TBS time split (setup% > 30% signals an
   environment problem), and recommends the next charter from your Outlook section.

## Starting path: scripted testing and UAT

For scripted manual testing or UAT - where a human tester or business stakeholder needs
a step-by-step script rather than an open-ended mission - start with
**`manual-test-script-author`**. Give it a feature spec and it emits either a step-table
(preconditions, steps, expected result, actual, pass/fail, notes) or Gherkin
(Given/When/Then) format, self-contained with all required data, one scenario per script.
For stakeholder sign-off scenarios, see **`uat-script-author`** which formats the same
content in business language with explicit acceptance-criteria verification and a sign-off
block.

## The four heuristic references

These four skills are pure-reference catalogs. You do not invoke them directly - the
agents preload them - but knowing when each applies helps you ask the right question
during a session.

| Heuristic | What it catalogs | Reach for it when... |
|---|---|---|
| **HICCUPPS-F** ([`hiccupps-f-heuristic`](../hiccupps-f-heuristic/SKILL.md)) | Michael Bolton's eight oracle types for deciding "is this a bug?" (History, Image, Comparable products, Claims, Users' desires, Product consistency, Purpose, Standards, Familiar problems) | You observe something and are not sure whether it is a defect - walk each oracle type to find the expectation it violates |
| **SFDPOT** ([`sfdpot-heuristic`](../sfdpot-heuristic/SKILL.md)) | James Bach's six dimensions of what to vary in a system (Structure, Function, Data, Platform, Operations, Time) | Your charter is set but you want to make sure your session varies the system in more than one dimension - SFDPOT is the "what to poke" checklist |
| **FCC CUTS VIDS** ([`fcc-cuts-vids-heuristic`](../fcc-cuts-vids-heuristic/SKILL.md)) | James Bach's mnemonic for modelling the system under test - Functions, Content, Criteria, Configurability, Users, Testability, States, Variability, Interfaces, Data, Scenarios | You are authoring a charter for an unfamiliar feature and need a systematic way to decompose what the system IS before deciding what to explore |
| **CRUSSPIC STMPL** ([`crusspic-stmpl-heuristic`](../crusspic-stmpl-heuristic/SKILL.md)) | James Bach's twelve quality-criteria heuristic for characterising what "good enough" means (Capability, Reliability, Usability, Security, Scalability, Performance, Installability, Compatibility, plus Supportability, Testability, Maintainability, Portability, Localizability) | You are writing a test strategy or charter and need to decide which quality dimensions apply - CRUSSPIC STMPL is the "what quality means here" checklist |

## What to do first

If you are completely new: run `charter-coach` with any feature you are currently working
on. The output will name the heuristics your session should apply. Read the relevant
heuristic skill once to understand the vocabulary, then run the session. File your session
sheet and debrief it with `session-debrief-coach`. After two or three cycles the
vocabulary will be natural.

## References

- Bach J., Bach J. *Session-Based Test Management* (2000) -
  [satisfice.com/sbtm](https://www.satisfice.com/sbtm).
- Whittaker J. *Exploratory Software Testing* (Addison-Wesley, 2009) - source of the
  seven canonical tours in `exploratory-tours-reference`.
- Bolton M. HICCUPPS-F oracle heuristic -
  [developsense.com](https://developsense.com/blog/2012/07/few-hiccupps).
- Sibling skills:
  [`sbtm-reference`](../sbtm-reference/SKILL.md),
  [`exploratory-tours-reference`](../exploratory-tours-reference/SKILL.md),
  [`hiccupps-f-heuristic`](../hiccupps-f-heuristic/SKILL.md),
  [`sfdpot-heuristic`](../sfdpot-heuristic/SKILL.md),
  [`fcc-cuts-vids-heuristic`](../fcc-cuts-vids-heuristic/SKILL.md),
  [`crusspic-stmpl-heuristic`](../crusspic-stmpl-heuristic/SKILL.md),
  [`manual-test-script-author`](../manual-test-script-author/SKILL.md),
  [`uat-script-author`](../uat-script-author/SKILL.md).
- Agents: [`charter-coach`](../../agents/charter-coach.md),
  [`session-debrief-coach`](../../agents/session-debrief-coach.md).
