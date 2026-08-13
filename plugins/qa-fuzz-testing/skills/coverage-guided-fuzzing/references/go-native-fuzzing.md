# Go native fuzzing (go test -fuzz)

Per-engine reference for `coverage-guided-fuzzing`; the shared workflow
and fuzzer-choice routing live in [../SKILL.md](../SKILL.md).

## Overview

Per [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz),
unlike libFuzzer / AFL++, Go's native fuzzer is:

- Native: no separate toolchain
- Typed: `f.Fuzz(func(t *testing.T, s string, n int) { ... })`
- Integrated: failing inputs auto-saved as test fixtures

For sanitiser pairing: Go uses the **race detector** (`-race`) as
its TSan-equivalent; ASan-equivalent comes via `gcflags` (limited).

For corpus discipline see
[corpus-management.md](corpus-management.md).

## When to use

- Fuzzing a Go library function (parser, encoder, validator).
- A function with typed scalar / string / byte-slice inputs (Go's
  native fuzzer handles these without a FuzzedDataProvider).
- Lightweight CI fuzz pass alongside `go test`.

For binary-level fuzzing of Go programs, AFL++ in `-Q` mode also
works.

## Authoring

### Define a fuzz target

In any `_test.go` file alongside your unit tests:

```go
package parser

import "testing"

func FuzzParseQuery(f *testing.F) {
    f.Add("SELECT * FROM users WHERE id = 1")
    f.Add("INSERT INTO foo VALUES (1, 'bar')")
    f.Add("")

    f.Fuzz(func(t *testing.T, q string) {
        result, err := ParseQuery(q)
        if err != nil {
            return
        }
        if result == nil {
            t.Fatalf("ParseQuery returned nil result with no error for %q", q)
        }
    })
}
```

Per [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz):

- The function name must start with `Fuzz`
- The parameter is `*testing.F`
- `f.Add(seed1, seed2, ...)` adds seed inputs
- `f.Fuzz(fn)` registers the fuzz callback; `fn` takes
  `*testing.T` followed by typed parameters

### Supported parameter types

Go's fuzzer supports these types as fuzz parameters:

| Type | Notes |
|---|---|
| `[]byte` | Variable-length byte slices |
| `string` | Variable-length strings |
| `bool` | Single byte |
| `byte`, `rune` | Integers |
| `int`, `int8`, `int16`, `int32`, `int64` | Signed integers |
| `uint`, `uint8`, `uint16`, `uint32`, `uint64` | Unsigned integers |
| `float32`, `float64` | Floats |

Multi-parameter functions are fuzzed jointly:

```go
f.Fuzz(func(t *testing.T, port int, host string, body []byte) {
    handleRequest(host, port, body)
})
```

The fuzzer mutates all parameters together.

### Seed corpus

Two sources for seeds:

1. **Inline `f.Add(...)` calls** - versioned in code, executed
   on every test run.
2. **Files in `testdata/fuzz/FuzzXxx/`** - versioned text files,
   one per seed, in the same package.

The seed file format (per Go docs):

```
go test fuzz v1
string("SELECT * FROM users WHERE id = 1")
int(42)
```

For multi-parameter targets, each line corresponds to a parameter
in order.

### Failure auto-save

When `go test -fuzz=Xxx` finds a failure, it writes the failing
input to `testdata/fuzz/FuzzXxx/<sha256>`. On the next `go test`
run, this file becomes a regular regression test that must pass - 
no more `-fuzz` flag needed.

This is the **unique strength of Go's approach**: failing inputs
become permanent regression coverage as part of the test fixture.

## Running

### Fuzz a target

```bash
# Run the unit tests + seeds (no exploration)
go test ./parser/

# Fuzz a specific target for 30 seconds
go test -fuzz=FuzzParseQuery -fuzztime=30s ./parser/

# Fuzz indefinitely (CI long-running)
go test -fuzz=FuzzParseQuery ./parser/
```

### Common flags

| Flag | Effect |
|---|---|
| `-fuzz=NAME` | Run the fuzz target with the given name |
| `-fuzztime=DURATION` | Stop after duration (e.g., `30s`, `1h`) or `-1` for indefinite |
| `-fuzzminimizetime=DURATION` | Time spent minimising failures (default 1m) |
| `-fuzzcachedir=PATH` | Where to cache mutations (default `$GOCACHE/fuzz/`) |
| `-parallel=N` | Concurrent workers |
| `-race` | Enable race detector (TSan-equivalent) |

### Race detector

Pair fuzzing with the race detector for thread-safety bugs:

```bash
go test -race -fuzz=FuzzConcurrentAccess -fuzztime=10m ./...
```

## Parsing results

When a failure occurs, Go prints:

```
--- FAIL: FuzzParseQuery (3.45s)
    --- FAIL: FuzzParseQuery/c1d4e1...
    fuzz: minimizing 50-byte failing input file
    --- FAIL: FuzzParseQuery (0.00s)
        parser_test.go:18: ParseQuery returned nil result with no error for "..."

    Failing input written to testdata/fuzz/FuzzParseQuery/c1d4e1abc...

    To re-run:
    go test -run=FuzzParseQuery/c1d4e1abc... ./parser/
```

Per the Go docs, the failing input lives at
`testdata/fuzz/FuzzXxx/<hash>` - commit it as part of the fix
to lock in regression coverage.

### Reproducing a saved failure

```bash
go test -run=FuzzParseQuery/c1d4e1abc... ./parser/
```

This treats the saved file as a regular `t.Run` sub-test, no
fuzzing.

## CI integration

```yaml
- uses: actions/setup-go@v5
  with: { go-version: '1.22' }
- name: Run tests (incl. seeds)
  run: go test -race ./...
- name: Smoke fuzz (3 min per target)
  run: |
    for target in $(grep -rh "^func Fuzz" --include="*_test.go" | \
                    awk '{print $2}' | sed 's/(.*//'); do
      echo "Fuzzing $target"
      go test -fuzz=$target -fuzztime=180s ./... || true
    done
- name: Commit any new regression fixtures
  if: always()
  run: |
    if git diff --quiet testdata/; then exit 0; fi
    git config user.name "fuzz-bot"
    git config user.email "fuzz-bot@example.com"
    git add testdata/
    git commit -m "Add fuzz failure fixtures"
    # PR or push - per team convention
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Missing `f.Add` calls | Fuzzer starts from empty corpus; slow path discovery | Add 3-10 representative seeds |
| Skipping `t.Fatalf` for invariant violations | Fuzzer can't detect logical bugs | Assert invariants explicitly |
| Not committing `testdata/fuzz/` | Lose regression coverage on next run | Commit alongside the fix |
| `-fuzztime=10s` in CI | Too short to find anything new | Use 1-5 min smoke; long campaigns separate |
| One huge fuzz target | Slow iteration; unclear coverage attribution | Split per function |
| Fuzz target without `-race` | Misses concurrency bugs in concurrent code | `go test -race -fuzz=...` |
| Ignoring `testdata/` after CI fuzz | New regression fixtures lost | Commit + PR them automatically |

## Limitations

- **Go-only.** Doesn't fuzz CGo or C dependencies; for those, use
  AFL++ or libFuzzer with a Go wrapper.
- **Typed parameter only.** No `[]byte → struct` mutation beyond
  the supported types; complex inputs need manual unmarshalling
  in the fuzz body.
- **No native ASan equivalent.** Go's GC + memory safety make
  many ASan-style bugs impossible; race detector covers
  concurrency.
- **Slower than libFuzzer for tight loops** - coverage
  instrumentation is per-block via gcflags.
- **`-fuzz` is single-target.** Can't fuzz multiple `FuzzXxx`
  simultaneously in one `go test` invocation; loop or use `-jobs`.

## References

- Go native fuzzing - 
  [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz).
- Go testing package - 
  [pkg.go.dev/testing#F](https://pkg.go.dev/testing#F).
- Composes:
  [corpus-management.md](corpus-management.md).
- Sibling fuzzers:
  [libfuzzer.md](libfuzzer.md),
  [afl-plus-plus.md](afl-plus-plus.md),
  [cargo-fuzz.md](cargo-fuzz.md),
  [atheris.md](atheris.md),
  [jazzer.md](jazzer.md),
  OSS-Fuzz ([google.github.io/oss-fuzz](https://google.github.io/oss-fuzz/)).
- Umbrella: [../SKILL.md](../SKILL.md) - fuzzer choice + shared workflow.
