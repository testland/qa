---
name: cli-output-conventions
description: "Conventions for designing AND testing CLI output so it stays parseable and assertable - exit-code policy (0 success, non-zero failure with stable codes per failure mode), `stdout` for primary data / `stderr` for messages, `--json` / `--plain` for machine-readable output, deterministic ordering and timestamps, `NO_COLOR` / TTY-aware color, `-q` / `--verbose` discipline, and stable `--help` / `--version`. Built on the [Command Line Interface Guidelines][clig]. Use as the assertion contract for `bats-testing` (text CLIs) and to tell `tui-snapshot-tester` what does NOT need a snapshot."
rating: 22
d6: 4
archetype: S2
---

# cli-output-conventions

## Overview

Per [clig][clig]:

[clig]: https://clig.dev/

> "Send output to `stdout`. The primary output for your command
> should go to `stdout`. Anything that is machine readable should
> also go to `stdout`."
>
> "Send messaging to `stderr`. Log messages, errors, and so on
> should all be sent to `stderr`."

Tests can only assert on output that is **stable, separated, and
documented**. This skill defines those conventions; sister skills
([`bats-testing`](../bats-testing/SKILL.md),
[`tui-snapshot-tester`](../tui-snapshot-tester/SKILL.md)) test
against them.

## When to use

- Authoring or reviewing a CLI's output (any new flag, command,
  or error message).
- Writing tests for a CLI: this skill tells you WHAT to assert
  on; bats / pytest etc. tell you HOW.
- A CLI's tests are flaky / brittle - usually the underlying
  output isn't deterministic. Fix the output, not the assertion.

## Convention 1 - Exit codes

Per [clig][clig]:

> "Return zero exit code on success, non-zero on failure."

> "Map non-zero codes to important failure modes for script
> integration."

```
Exit code | Meaning
----------+----------------------------
0         | Success
1         | General error (catch-all)
2         | Misuse (bad flag, bad usage)
3         | Resource not found
4         | Permission denied
5         | Network / external failure
... documented per CLI
```

**Test pattern:**

```bash
@test "exit 0 on success" {
  run mycli list
  [ "$status" -eq 0 ]
}

@test "exit 2 on bad flag" {
  run mycli --nonexistent
  [ "$status" -eq 2 ]
}
```

Don't test `[ "$status" -ne 0 ]` - assert the **specific** code.
Otherwise refactors silently change the contract.

## Convention 2 - stdout vs stderr

Per [clig][clig]: "This separation ensures piped commands receive
only data, not messages."

```bash
# Good: data on stdout, message on stderr
$ mycli list 2>/dev/null
alice
bob

$ mycli list >/dev/null
fetched 2 users in 0.3s
```

**Test pattern (bats):**

```bash
@test "list emits names on stdout, status on stderr" {
  run --separate-stderr mycli list
  [ "$status" -eq 0 ]
  [ "$output" = $'alice\nbob' ]
  [[ "$stderr" == *"fetched 2 users"* ]]
}
```

`run --separate-stderr` (Bats 1.5+) splits the streams; without
it, `$output` mixes both.

## Convention 3 - Machine-readable mode

Per [clig][clig]:

> "Display output as formatted JSON if `--json` is passed."

> "If human-readable output breaks machine-readable output, use
> `--plain` to display output in plain, tabular text format for
> integration with tools like `grep` or `awk`."

> "Encourage your users to use `--plain` or `--json` in scripts
> to keep output stable."

```bash
$ mycli list --json | jq '.[] | .name'
"alice"
"bob"

$ mycli list --plain
alice  active   2026-04-15
bob    active   2026-04-20
```

**Test pattern:** assert against `--json`, never against the
human-formatted default. Human output is allowed to evolve;
JSON is the contract.

```bash
@test "list --json contract" {
  run mycli list --json
  assert_success
  echo "$output" | jq -e '.[0] | has("name") and has("status")'
}
```

## Convention 4 - Determinism

Stable output for tests requires:

- **No timestamps** in default output (only with `--verbose` or
  human-mode banner).
- **Stable ordering** - sort lists by a canonical key, not insertion
  order.
- **No random IDs** in output unless documented.
- **Locale-independent number formatting** in `--json` /
  `--plain` (no thousand separators; ISO 8601 dates).

```bash
# Bad: randomized order, locale-dependent date
$ mycli list
bob   2026/04/20
alice 2026/04/15

# Good: sorted, ISO 8601
$ mycli list --plain
alice 2026-04-15
bob   2026-04-20
```

**Test pattern:** golden-file comparison with sorted output.

## Convention 5 - Color & TTY

Per [clig][clig]:

> "Disable color if your program is not in a terminal or the user
> requested it."

Disable color when:
- `stdout` (or `stderr`) is not a TTY.
- `NO_COLOR` env var is set (per `https://no-color.org/`).
- `TERM=dumb`.
- `--no-color` flag passed.

> "If `stdout` is not an interactive terminal, don't display any
> animations."

Progress bars / spinners only on TTY - they pollute CI logs and
break `wc -l` assertions.

**Test pattern:**

```bash
@test "no ANSI codes when piped" {
  run bash -c 'mycli list | cat'
  [ "$status" -eq 0 ]
  refute_output --regexp $'\\x1b\\['
}

@test "NO_COLOR honored" {
  NO_COLOR=1 run mycli list
  refute_output --regexp $'\\x1b\\['
}
```

## Convention 6 - Quiet & verbose

Per [clig][clig]:

> "you can provide a `-q` option to suppress all non-essential
> output."

> "By default, don't output information that's only understandable
> by the creators of the software... only in verbose mode."

```
Mode      | Flag         | Use
----------+--------------+--------------------
Quiet     | -q / --quiet | Scripts; only data + errors
Default   | (none)       | Interactive; status messages on stderr
Verbose   | -v           | Debug info on stderr
Debug     | -vv / --debug| Internal traces on stderr
```

**Test pattern:**

```bash
@test "-q suppresses status messages" {
  run --separate-stderr mycli -q list
  [ "$status" -eq 0 ]
  [ -n "$output" ]    # data still on stdout
  [ -z "$stderr" ]    # no status messages
}
```

## Convention 7 - `--help` and `--version`

Per [clig][clig]:

> "Show full help when `-h` and `--help` are passed... you should
> be able to add `-h` to the end of anything and it should show
> help."

```bash
@test "--help exits 0 and mentions Usage" {
  run mycli --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "subcommand --help exits 0" {
  run mycli list --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"list"* ]]
}

@test "--version emits machine-parseable version" {
  run mycli --version
  [ "$status" -eq 0 ]
  [[ "$output" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]
}
```

`--version` should be parseable: `mycli 1.2.3` or
`mycli version 1.2.3` - never `Welcome to mycli! Version 1.2.3`.

## Convention 8 - Document the contract

Each CLI repo should have a CONVENTIONS.md (or section in README):

```markdown
## Output contract

- Exit codes: 0 ok, 2 bad usage, 3 not found, 4 perm denied, 5 network.
- `stdout` = primary data; `stderr` = status / errors / progress.
- `--json` is the stable machine contract; default human output may evolve.
- `NO_COLOR` and TTY detection respected.
- All dates in `--json` are ISO 8601 UTC.
```

Tests assert against the contract. If the contract changes, both
the document and the tests update in the same PR.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Tests assert `status -ne 0`                                            | Refactors silently change error code; scripts break.                    | Assert specific code (Convention 1). |
| Errors on stdout                                                       | Pipes carry error text into downstream parsers.                        | stderr (Convention 2). |
| Tests assert against default human output                              | Human output evolves; tests churn.                                      | Test against `--json` (Convention 3). |
| Timestamps in default output                                           | Tests fail on every run.                                                | Verbose-mode only (Convention 4). |
| ANSI codes leak when piped                                             | `wc -l`, `grep`, etc. break.                                           | TTY check + `NO_COLOR` (Convention 5). |
| Progress bars in CI                                                    | CI logs flooded; tests can't assert frame counts.                      | TTY check (Convention 5). |
| Help output requires network / config                                 | `--help` should always work.                                            | Help is local + static. |
| `--version` mixed with marketing                                       | Tooling can't parse.                                                    | Pure version string (Convention 7). |

## Limitations

- **Legacy CLIs.** Adopting this skill against an existing CLI
  requires a deprecation cycle for output changes.
- **Verbose / debug modes are inherently non-deterministic.**
  Don't snapshot them; assert presence of key markers.
- **Cross-shell quoting.** Bats runs in Bash; PowerShell tests
  via Pester need their own assertions.
- **Color contract is OS-dependent.** Windows terminal emulators
  have different ANSI support; test on the target platforms.

## References

- [clig][clig] - Command Line Interface Guidelines: exit codes,
  stdout / stderr, `--json` / `--plain`, `NO_COLOR`, `-q` /
  `--verbose`, `--help` / `--version`.
- `https://no-color.org/` - `NO_COLOR` informal standard.
- ISO 8601 - date / time format for `--json` output.
- [`bats-testing`](../bats-testing/SKILL.md) - Bash-based
  assertion runner that consumes this contract.
- [`tui-snapshot-tester`](../tui-snapshot-tester/SKILL.md) - 
  layout-level snapshots; this skill covers text-level contract.
