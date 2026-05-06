# qa-cli-tools

CLI + TUI testing tools. Bats-core for shell script + binary
exit-code/output assertions, Textual snapshot testing for TUIs
(plus equivalents for Ratatui / Bubble Tea / Ink), and the
output-conventions skill that defines the assertion contract
both consume.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [bats-testing](skills/bats-testing/SKILL.md) | S1 | Bats-core testing for shell scripts and CLIs (`@test`, `run`, `setup`/`teardown`, parallel, JUnit/TAP). |
| Skill | [tui-snapshot-tester](skills/tui-snapshot-tester/SKILL.md) | S3 | TUI snapshot tests via `pytest-textual-snapshot` + Pilot; equivalents for Ratatui (insta), Bubble Tea (teatest), Ink. |
| Skill | [cli-output-conventions](skills/cli-output-conventions/SKILL.md) | S2 | Output-contract conventions: exit codes, stdout/stderr, `--json`/`--plain`, `NO_COLOR`, `-q`/`--verbose`, `--help`/`--version`. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-cli-tools@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
