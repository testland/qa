# qa-cli-tools

CLI + TUI testing tools. Bats-core for shell script + binary
exit-code/output assertions, Textual snapshot testing for TUIs
(plus equivalents for Ratatui / Bubble Tea / Ink), and the
output-conventions skill that defines the assertion contract
both consume.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [bats-testing](skills/bats-testing/SKILL.md) | Bats-core testing for shell scripts and CLIs (`@test`, `run`, `setup`/`teardown`, parallel, JUnit/TAP). |
| Skill | [tui-snapshot-tester](skills/tui-snapshot-tester/SKILL.md) | TUI snapshot tests via `pytest-textual-snapshot` + Pilot; equivalents for Ratatui (insta), Bubble Tea (teatest), Ink. |
| Skill | [cli-output-conventions](skills/cli-output-conventions/SKILL.md) | Output-contract conventions: exit codes, stdout/stderr, `--json`/`--plain`, `NO_COLOR`, `-q`/`--verbose`, `--help`/`--version`. |
| Skill | [pester-cli-testing](skills/pester-cli-testing/SKILL.md) | Test PowerShell CLIs/scripts with Pester v5: Describe/It, Should, Mock, coverage, CI. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-cli-tools@testland-qa
```
