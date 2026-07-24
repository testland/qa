---
name: bats-testing
description: "Configures Bats-core (Bash Automated Testing System) for testing CLI tools, shell scripts, and Unix programs - `.bats` test files with `@test` blocks, `run` to capture command exit + output, `[ \"$status\" -eq 0 ]` and `[ \"$output\" = ... ]` assertions, `setup`/`teardown` hooks, `load` for shared helpers, parallel execution via `--jobs N`, TAP-compliant output for CI integration. Use whenever the unit-under-test is a shell script, CLI binary, or anything invokable from Bash."
---

# bats-testing

## Overview

Per [bats-readthedocs][bats]:

[bats]: https://bats-core.readthedocs.io/en/stable/

> "Bats (Bash Automated Testing System) is a TAP-compliant testing
> framework for Bash 3.2 or above."

Per [bats-github][bgh]:

[bgh]: https://github.com/bats-core/bats-core

> "Bats is a TAP-compliant testing framework for Bash 3.2 or above.
> It provides a simple way to verify that the UNIX programs you
> write behave as expected."

Bats works "with any Unix program," not just Bash - it captures
stdout / stderr / exit code of any executable.

## When to use

- Testing a shell script (deployment scripts, CI scripts,
  installers).
- Testing a CLI binary's interface (commands, flags, exit codes,
  output) at the integration layer.
- Validating that wrapper scripts (e.g., `kubectl` plugins, `git`
  aliases) behave as expected.
- Cross-platform smoke tests for a CLI's install scripts.

## Step 1 - Install

Per [bgh][bgh]:

```bash
# npm
npm install -g bats

# Homebrew
brew install bats-core

# Git submodule (vendored, deterministic for CI)
git submodule add https://github.com/bats-core/bats-core.git test/bats
git submodule add https://github.com/bats-core/bats-support.git test/test_helper/bats-support
git submodule add https://github.com/bats-core/bats-assert.git test/test_helper/bats-assert
```

The git-submodule approach pins the Bats version per repo - 
recommended for CI determinism.

## Step 2 - First test file

Per [bgh][bgh] (verbatim example):

```bash
#!/usr/bin/env bats

@test "addition using bc" {
  result="$(echo 2+2 | bc)"
  [ "$result" -eq 4 ]
}

@test "addition using dc" {
  result="$(echo 2 2+p | dc)"
  [ "$result" -eq 4 ]
}
```

Save as `test/math.bats`; run `bats test/math.bats`.

## Step 3 - `run` for exit-code + output capture

The `run` helper invokes a command and captures `$status`,
`$output`, and `$lines[]`:

```bash
@test "myscript --help exits 0 and mentions usage" {
  run ./myscript --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "myscript with no args exits 1" {
  run ./myscript
  [ "$status" -eq 1 ]
  [ "$output" = "error: missing required argument" ]
}

@test "myscript output line count" {
  run ./myscript list
  [ "$status" -eq 0 ]
  [ "${#lines[@]}" -eq 3 ]
  [ "${lines[0]}" = "alice" ]
}
```

Without `run`, a non-zero exit code aborts the test before
assertions execute.

## Step 4 - `setup` / `teardown`

Per [bats][bats]: "setup and teardown: Pre- and post-test hooks."

```bash
setup() {
  TEST_DIR="$(mktemp -d)"
  cp fixtures/sample.txt "$TEST_DIR/"
}

teardown() {
  rm -rf "$TEST_DIR"
}

@test "myscript processes the sample file" {
  run ./myscript "$TEST_DIR/sample.txt"
  [ "$status" -eq 0 ]
}
```

`setup_file` / `teardown_file` run once per file (vs once per
test). Use for expensive setup (Docker container start,
database init).

## Step 5 - `load` shared helpers

Per [bats][bats]: "load: Share common code."

```bash
# test/test_helper.bash
make_temp_repo() {
  local d
  d="$(mktemp -d)"
  (cd "$d" && git init -q)
  echo "$d"
}
```

```bash
# test/integration.bats
load test_helper

@test "git status in fresh repo is clean" {
  local d
  d="$(make_temp_repo)"
  cd "$d"
  run git status --porcelain
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}
```

## Step 6 - bats-assert / bats-support

Better assertions than raw `[ ]`:

```bash
load test_helper/bats-support/load
load test_helper/bats-assert/load

@test "myscript produces expected JSON" {
  run ./myscript --json
  assert_success
  assert_output --partial '"version":'
  refute_output --partial 'ERROR'
}

@test "myscript fails on bad input" {
  run ./myscript --bad-flag
  assert_failure 2
  assert_line --index 0 "Unknown flag: --bad-flag"
}
```

`assert_success` / `assert_failure` / `assert_output` /
`assert_line` give clear diff-style failure messages (vs `[ ]`'s
silent fail).

## Step 7 - `skip`

Per [bats][bats]: "skip: Easily skip tests."

```bash
@test "macOS-only behavior" {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    skip "macOS-only test"
  fi
  run ./myscript --use-keychain
  [ "$status" -eq 0 ]
}

@test "needs docker daemon" {
  if ! command -v docker >/dev/null; then
    skip "docker not installed"
  fi
  if ! docker info >/dev/null 2>&1; then
    skip "docker daemon not running"
  fi
  run ./deploy-script --dry-run
  [ "$status" -eq 0 ]
}
```

`skip` reports the reason in test output (vs commenting out, which
hides the fact that coverage dropped).

## Step 8 - Parallel execution

Per [bats][bats]: "Parallel Execution."

```bash
# Install GNU parallel first (apt install parallel / brew install parallel)
bats --jobs 4 test/
```

Tests must be independent - share no global filesystem state, no
shared ports. Use `setup`/`teardown` with `mktemp -d` to isolate.

## Step 9 - Output formats

```bash
# Default (pretty)
bats test/

# TAP (CI-friendly, parseable)
bats --tap test/

# JUnit XML (for CI dashboards via TAP-to-JUnit converters)
bats --formatter junit test/ > junit.xml

# Verbose (show stdout/stderr of every command)
bats --verbose-run test/
```

## Step 10 - CI integration

```yaml
jobs:
  bats:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with: { submodules: recursive }
      - run: |
          sudo apt-get install -y parallel
      - run: bats --jobs 4 --formatter junit test/ > junit.xml
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: bats-junit, path: junit.xml }
```

For Docker-based CI, per [bats][bats]: "Running Bats in Docker"
using the official `bats/bats:latest` image:

```yaml
- run: docker run --rm -v "$PWD:/code" bats/bats:latest test/
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Calling commands directly without `run`                               | Non-zero exit aborts the test before any assertion runs.                  | Wrap with `run`; check `$status`. |
| Tests sharing `/tmp` / fixed ports                                    | Parallel execution breaks intermittently.                                | Per-test `mktemp -d` in `setup` (Step 4). |
| Using `[ ]` for everything                                            | Silent failures; no diff message.                                       | bats-assert (Step 6). |
| Commenting out skipped tests                                          | Hides coverage loss; no signal.                                         | `skip` with reason (Step 7). |
| Asserting full multiline output                                       | Brittle - any whitespace change breaks tests.                          | Use `assert_output --partial` or `assert_line --index N`. |
| One mega `.bats` file                                                 | Slow; hard to grep failures.                                          | Per-feature files in `test/`. |

## Limitations

- **Bash-only.** Tests are written in Bash; PowerShell scripts
  need Pester instead.
- **Slow vs in-language tests.** Each `run` forks a process - 
  expensive vs library-level tests in the language.
- **Output capture quirks.** `run` strips trailing newlines; some
  binary output is not faithfully captured.
- **Windows requires WSL or Git Bash.** Per [bats][bats]:
  "Installing Bats from source via Git Bash."

## References

- [bats][bats] - overview, install methods, test structure,
  `@test` / `run` / `setup` / `teardown` / `load` / `skip`,
  parallel execution, Docker.
- [bgh][bgh] - example test file, install one-liners.
- `tui-snapshot-tester` - 
  TUI snapshot tests (visual layer; bats covers exit code +
  text output).
- `cli-output-conventions` - what to assert on (stable formats, exit codes, stderr).
