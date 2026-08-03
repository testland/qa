# qa-manual-testing

Manual scripted + exploratory testing. Covers session-based exploratory testing per Jonathan and James Bach's SBTM, tour-based exploration heuristics per Whittaker's seven canonical tours, scripted manual test authoring, UAT scripts in stakeholder format, bug-bash facilitation, and structured PROOF debriefs.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [manual-test-script-author](skills/manual-test-script-author/SKILL.md) | Build-an-X scripted manual test cases - step-table or Gherkin format with self-contained data and per-step expected results. |
| Skill | [test-execution-checklist](skills/test-execution-checklist/SKILL.md) | Build-an-X focused checklists for smoke / first-pass / bug-bash / compliance scenarios. |
| Skill | [exploratory-tours-reference](skills/exploratory-tours-reference/SKILL.md) | Pure-reference catalog of the seven canonical Whittaker tours: Feature, Money, Landmark, Intellectual, Bad-data, Configuration, Garbage collector. |
| Skill | [bug-bash-facilitator](skills/bug-bash-facilitator/SKILL.md) | Build-an-X structured multi-tester session: pre-bash kit + cohort charters + real-time triage board + scoring + post-bash cluster debrief. |
| Skill | [uat-script-author](skills/uat-script-author/SKILL.md) | Build-an-X UAT scripts in stakeholder-readable business language: pre-conditions + journey steps + expected outcomes + AC verification + sign-off. |
| Skill | [manual-test-debrief](skills/manual-test-debrief/SKILL.md) | Build-an-X session debrief in PROOF format (Past, Results, Obstacles, Outlook, Feelings) + 3-bucket time accounting + cross-session aggregation. |
| Skill | [session-based-test-management-reference](skills/session-based-test-management-reference/SKILL.md) | Pure-reference catalog of Session-Based Test Management: charters, time-boxed sessions, TBS metrics. |
| Skill | [hiccupps-f-heuristic](skills/hiccupps-f-heuristic/SKILL.md) | Pure-reference catalog of Bolton's HICCUPPS-F oracle heuristic for deciding whether something is a problem. |
| Skill | [sfdpot-exploratory-heuristic](skills/sfdpot-exploratory-heuristic/SKILL.md) | Pure-reference catalog of Bach's SFDPOT ("San Francisco Depot") product-element coverage heuristic. |
| Skill | [fcc-cuts-vids-heuristic](skills/fcc-cuts-vids-heuristic/SKILL.md) | Pure-reference catalog of Michael Kelly's FCC CUTS VIDS touring heuristic for learning an unfamiliar application. |
| Skill | [crusspic-stmpl-heuristic](skills/crusspic-stmpl-heuristic/SKILL.md) | Pure-reference catalog of Bach's CRUSSPIC STMPL twelve quality-criteria heuristic. |
| Skill | [decision-table-test-design](skills/decision-table-test-design/SKILL.md) | Build-an-X manual test cases from business-rule specs via decision tables: full 2^n matrix, collapse, infeasible-combination analysis, one case per feasible column (ISTQB CTFL 4.2.3). |
| Skill | [state-transition-test-design](skills/state-transition-test-design/SKILL.md) | Build-an-X manual test cases from stateful behavior: state table with invalid transitions, coverage-level choice (all states / 0-switch / 1-switch / all transitions), event-sequence cases (ISTQB CTFL 4.2.4). |
| Agent | [charter-coach](agents/charter-coach.md) | Turns a feature + risk areas into a well-formed SBTM exploratory charter (mission, areas, HICCUPPS-F oracles, SFDPOT elements, tours). |
| Agent | [session-debrief-coach](agents/session-debrief-coach.md) | Reviews a completed SBTM session sheet: PROOF completeness, TBS time-split health, and the recommended next charter. |
| Agent | [test-script-quality-critic](agents/test-script-quality-critic.md) | Adversarial review of authored manual scripts for vague preconditions, bundled steps, missing expected results, and imperative-where-declarative slots. |
| Skill | [manual-testing-overview](skills/manual-testing-overview/SKILL.md) | Junior on-ramp: the SBTM charter to session to debrief path and when to use each heuristic. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-manual-testing@testland-qa
```
