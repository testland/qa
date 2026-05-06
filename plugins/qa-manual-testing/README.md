# qa-manual-testing

Manual scripted + exploratory testing. Covers session-based exploratory testing per Bach + Bach SBTM, tour-based exploration heuristics per Whittaker's seven canonical tours, scripted manual test authoring, UAT scripts in stakeholder format, bug-bash facilitation, and structured PROOF debriefs.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [manual-test-script-author](skills/manual-test-script-author/SKILL.md) | S3 | Build-an-X scripted manual test cases — step-table or Gherkin format with self-contained data and per-step expected results. |
| Skill | [test-execution-checklist](skills/test-execution-checklist/SKILL.md) | S3 | Build-an-X focused checklists for smoke / first-pass / bug-bash / compliance scenarios. |
| Skill | [tour-based-explorer-prompt](skills/tour-based-explorer-prompt/SKILL.md) | S2 | Pure-reference catalog of the seven canonical Whittaker tours: Feature, Money, Landmark, Intellectual, Bad-data, Configuration, Garbage collector. |
| Skill | [bug-bash-facilitator](skills/bug-bash-facilitator/SKILL.md) | S3 | Build-an-X structured multi-tester session: pre-bash kit + cohort charters + real-time triage board + scoring + post-bash cluster debrief. |
| Skill | [uat-script-author](skills/uat-script-author/SKILL.md) | S3 | Build-an-X UAT scripts in stakeholder-readable business language: pre-conditions + journey steps + expected outcomes + AC verification + sign-off. |
| Skill | [manual-test-debrief](skills/manual-test-debrief/SKILL.md) | S3 | Build-an-X session debrief in PROOF format (Past, Results, Outlook, Obstacles, Feelings) + 3-bucket time accounting + cross-session aggregation. |
| Agent | [exploratory-charter-author](agents/exploratory-charter-author.md) | A4 | Builder/scaffolder for SBTM charter cards: mission + areas + time-box + suggested tours + PROOF deliverables + out-of-scope. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-manual-testing@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
