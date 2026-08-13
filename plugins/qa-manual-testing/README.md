# qa-manual-testing

Manual scripted + exploratory testing. Human-driven testing has two modes:
**scripted** (steps, data, and expected results fixed before execution - the
repeatable, signable record) and **exploratory** (tests designed, executed,
and evaluated simultaneously while the tester learns - what finds the bugs
nobody thought to anticipate). This plugin covers both: scripted manual test
authoring in four formats (step-table, Gherkin, UAT, checklist), systematic
test-design techniques (decision tables, state transitions), session-based
exploratory testing per Jonathan and James Bach's SBTM with the classic
heuristic catalogs (Whittaker's tours, FCC CUTS VIDS, SFDPOT, HICCUPPS-F,
CRUSSPIC STMPL) bundled as references, bug-bash facilitation, and an
adversarial script-quality gate.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [manual-test-script-author](skills/manual-test-script-author/SKILL.md) | Build-an-X scripted manual test cases in four formats - step-table, Gherkin, business-language UAT scripts with sign-off, and one-line execution checklists - with self-contained data and per-step expected results. |
| Skill | [exploratory-testing](skills/exploratory-testing/SKILL.md) | Session-based exploratory testing per SBTM: charters, time-boxed sessions, TBS metrics, PROOF debriefs; bundles Whittaker's seven tours, Kelly's FCC CUTS VIDS, Bach's SFDPOT + CRUSSPIC STMPL, and Bolton's HICCUPPS-F as references, plus a charter-card template and a session-review checklist. |
| Skill | [decision-table-test-design](skills/decision-table-test-design/SKILL.md) | Build-an-X manual test cases from business-rule specs via decision tables: full 2^n matrix, collapse, infeasible-combination analysis, one case per feasible column (ISTQB CTFL 4.2.3). |
| Skill | [state-transition-test-design](skills/state-transition-test-design/SKILL.md) | Build-an-X manual test cases from stateful behavior: state table with invalid transitions, coverage-level choice (all states / 0-switch / 1-switch / all transitions), event-sequence cases (ISTQB CTFL 4.2.4). |
| Skill | [bug-bash-facilitator](skills/bug-bash-facilitator/SKILL.md) | Build-an-X structured multi-tester session: pre-bash kit + cohort charters + real-time triage board + scoring + post-bash cluster debrief. |
| Agent | [test-script-quality-critic](agents/test-script-quality-critic.md) | Adversarial review of authored manual scripts for vague preconditions, bundled steps, missing expected results, and imperative-where-declarative slots. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-manual-testing@testland-qa
```
