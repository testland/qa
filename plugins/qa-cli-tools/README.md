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

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-cli-tools@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
