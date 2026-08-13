# qa-bug-repro

Bug reproduction workflow: extracts bug reports from Playwright traces / HARs, builds minimal failing tests from issue reports, authors and reviews bug reports (including CI-failure-to-spec conversion), triages CI failures, and runs the weekly defect-review pipeline.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [bug-report-template](skills/bug-report-template/SKILL.md) | Build a triageable bug report from raw notes; convert a CI failure record into a classified, ready-to-file spec; audit any report against the pre-filing review checklist. |
| Skill | [ci-failure-triage](skills/ci-failure-triage/SKILL.md) | Decides what kind of failure a red test is before anyone fixes it: seven signals, an ordered first-match-wins rule set, and a verdict that records which alternatives were rejected and why. |
| Skill | [defect-escape-taxonomy](skills/defect-escape-taxonomy/SKILL.md) | Classifies a production escape into test, process, or tooling gap by the earliest layer that should have caught it, stated as a property of the system and never of a person. |
| Agent | [bug-report-from-recording](agents/bug-report-from-recording.md) | Action-taking: read a Playwright `trace.zip` (or HAR + console + screenshot) and emit a filled `bug-report-template` with verbatim error messages, reconstructed repro steps, and trace-derived environment block. |
| Agent | [bug-repro-builder](agents/bug-repro-builder.md) | Action-taking: turn a bug report into a minimal failing test (unit / integration / component / e2e) or a minimal-repro repository. |
| Agent | [defect-pipeline-runner](agents/defect-pipeline-runner.md) | Weekly defect-review pipeline in one agent: cluster the backlog by fingerprint, narrate the trend (Pareto + WoW deltas + escape rate), classify production escapes as test / process / tooling gaps. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-bug-repro@testland-qa
```
