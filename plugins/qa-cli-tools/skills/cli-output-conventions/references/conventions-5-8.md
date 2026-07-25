# CLI output conventions 5-8

Continuation of the output contract defined in `SKILL.md` (color/TTY, verbosity,
`--help`/`--version`, and documenting the contract). All cited to the
[Command Line Interface Guidelines](https://clig.dev/).

## Convention 5 - Color & TTY

Disable color when `stdout`/`stderr` is not a TTY, `NO_COLOR` is set (per [no-color.org](https://no-color.org/)), `TERM=dumb`, or `--no-color` is passed. Progress bars / spinners only on a TTY - they pollute CI logs and break `wc -l` assertions.

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

A `-q` option suppresses all non-essential output; creator-only detail appears only in verbose mode.

```
Mode      | Flag         | Use
----------+--------------+--------------------
Quiet     | -q / --quiet | Scripts; only data + errors
Default   | (none)       | Interactive; status messages on stderr
Verbose   | -v           | Debug info on stderr
Debug     | -vv / --debug| Internal traces on stderr
```

```bash
@test "-q suppresses status messages" {
  run --separate-stderr mycli -q list
  [ "$status" -eq 0 ]
  [ -n "$output" ]    # data still on stdout
  [ -z "$stderr" ]    # no status messages
}
```

## Convention 7 - `--help` and `--version`

`-h`/`--help` shows full help and works appended to any subcommand. `--version` must be machine-parseable (`mycli 1.2.3`), never `Welcome to mycli! Version 1.2.3`.

```bash
@test "--help exits 0 and mentions Usage" {
  run mycli --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "--version emits machine-parseable version" {
  run mycli --version
  [ "$status" -eq 0 ]
  [[ "$output" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]
}
```

## Convention 8 - Document the contract

Each CLI repo keeps a `CONVENTIONS.md` (or README section). Tests assert against it; if the contract changes, the document and the tests update in the same PR.

```markdown
## Output contract
- Exit codes: 0 ok, 2 bad usage, 3 not found, 4 perm denied, 5 network.
- `stdout` = primary data; `stderr` = status / errors / progress.
- `--json` is the stable machine contract; default human output may evolve.
- `NO_COLOR` and TTY detection respected.
- All dates in `--json` are ISO 8601 UTC.
```
