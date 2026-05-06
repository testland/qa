---
name: go-test
description: Configures and runs Go's stdlib `testing` package — `func TestXxx(t *testing.T)` convention; table-driven tests via slice + range; `t.Run` for subtests with hierarchical names; `t.Parallel()` for parallel execution; benchmarks (`func BenchmarkXxx(b *testing.B)`); examples (`func ExampleXxx()`); fuzzing (`func FuzzXxx(f *testing.F)`); coverage via `go test -cover`/`-coverprofile`; build tags for selective compilation. Use for any Go project — testing is a stdlib feature, no install needed.
rating: 24
d6: 4
archetype: S1
---

# go-test

## Overview

Per [pkg.go.dev/testing][go-test-pkg]:

[go-test-pkg]: https://pkg.go.dev/testing

Go's `testing` package is stdlib — no separate install, no
configuration file. The single binary `go test` discovers, builds,
and runs tests via convention.

Distinguishing properties:

- **Stdlib**: zero install; works wherever Go works.
- **Convention-driven**: `_test.go` suffix; `TestXxx` / `BenchmarkXxx`
  / `FuzzXxx` / `ExampleXxx` function-name prefixes.
- **Table-driven idiom**: built into the language style.
- **Built-in benchmarks + fuzzing** (Go 1.18+ for fuzz).

## Step 1 — First test

```go
// math.go
package math

func Add(a, b int) int {
    return a + b
}
```

```go
// math_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    if got := Add(1, 2); got != 3 {
        t.Errorf("Add(1, 2) = %d; want 3", got)
    }
}
```

Run:

```bash
go test ./...           # all packages recursively
go test ./mypackage     # specific package
go test -v              # verbose
go test -run TestAdd    # specific test by name pattern
```

## Step 2 — Table-driven tests (Go idiom)

Per [pkg.go.dev/testing#hdr-Subtests_and_Sub_benchmarks][go-subtests]:

[go-subtests]: https://pkg.go.dev/testing#hdr-Subtests_and_Sub_benchmarks

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name           string
        a, b, expected int
    }{
        {"positive", 1, 2, 3},
        {"zero", 0, 0, 0},
        {"negative", -1, 1, 0},
        {"large", 100, 200, 300},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := Add(tt.a, tt.b); got != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, got, tt.expected)
            }
        })
    }
}
```

`t.Run` creates subtests with hierarchical naming (`TestAdd/positive`,
`TestAdd/zero`, etc.). Subtests are filterable + reportable
individually.

## Step 3 — t.Parallel()

```go
func TestSomethingSlow(t *testing.T) {
    t.Parallel()   // marks this test as parallel-safe
    // ... slow operation
}
```

Parallel tests run concurrently with other parallel tests in the
same package. Tests without `t.Parallel()` run sequentially.

For subtests:

```go
for _, tt := range tests {
    tt := tt   // capture loop variable (pre-Go 1.22; not needed Go 1.22+)
    t.Run(tt.name, func(t *testing.T) {
        t.Parallel()
        // ...
    })
}
```

## Step 4 — Benchmarks

```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(1, 2)
    }
}
```

Run:

```bash
go test -bench=.                          # all benchmarks
go test -bench=BenchmarkAdd               # specific
go test -bench=. -benchmem                # memory allocation tracking
go test -bench=. -benchtime=10s           # 10s per benchmark
go test -bench=. -count=5                 # 5 runs each (use with benchstat)
```

For statistical comparison: `benchstat` tool compares two benchmark
runs:

```bash
go test -bench=. -count=10 > old.txt
# make changes
go test -bench=. -count=10 > new.txt
benchstat old.txt new.txt
```

## Step 5 — Examples (executable docs)

```go
func ExampleAdd() {
    fmt.Println(Add(1, 2))
    // Output: 3
}
```

The `// Output:` comment is the assertion. `go test` runs the
example + verifies output matches. Examples appear in `go doc`.

## Step 6 — Fuzzing (Go 1.18+)

```go
func FuzzAdd(f *testing.F) {
    f.Add(1, 2)   // seed corpus
    f.Add(0, 0)
    f.Add(-1, 1)

    f.Fuzz(func(t *testing.T, a, b int) {
        c := Add(a, b)
        if c-a != b {
            t.Errorf("Add(%d, %d) = %d; expected commutativity", a, b, c)
        }
    })
}
```

Run:

```bash
go test -fuzz=FuzzAdd                     # generates random inputs
go test -fuzz=FuzzAdd -fuzztime=30s       # bounded fuzz time
```

Failures cached at `testdata/fuzz/FuzzAdd/`; subsequent `go test`
runs replay those cases as regression tests.

## Step 7 — Coverage

```bash
go test -cover                                # summary
go test -coverprofile=coverage.out            # detailed
go tool cover -html=coverage.out              # browser view
go tool cover -func=coverage.out              # per-function

# Per-package coverage with all packages:
go test -coverprofile=coverage.out -coverpkg=./... ./...
```

Coverage threshold gating (no built-in flag; use shell):

```bash
go test -coverprofile=coverage.out ./...
COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print substr($3, 1, length($3)-1)}')
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
    echo "Coverage $COVERAGE% below 80% threshold"
    exit 1
fi
```

## Step 8 — Build tags for selective compilation

```go
//go:build integration

package mypackage

import "testing"

func TestIntegration(t *testing.T) {
    // only compiled with -tags=integration
}
```

Run:

```bash
go test -tags=integration ./...
```

Build tags allow per-environment test suites (unit / integration /
e2e) without separate folder structure.

## Step 9 — Test helpers

```go
func setupTest(t *testing.T) *Database {
    t.Helper()   // marks this as helper for cleaner failure stacks
    db := openTestDB()
    t.Cleanup(func() {
        db.Close()
    })
    return db
}

func TestUserCreation(t *testing.T) {
    db := setupTest(t)
    // ...
}
```

`t.Helper()` makes failure messages point to the caller, not the
helper. `t.Cleanup` runs after the test (replaces defer for
test-scoped resources).

## Step 10 — CI integration

```yaml
- run: go test -race -coverprofile=coverage.out -v ./...
- uses: codecov/codecov-action@v4
  with: { files: coverage.out }
```

`-race` enables the race detector (catches data races at test
time). Standard practice for any Go project with concurrency.

For JUnit XML output (consumable by [`junit-xml-analysis`](../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md)):

```bash
go install github.com/jstemmer/go-junit-report/v2@latest
go test -v ./... | go-junit-report > junit.xml
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `t.Parallel()` everywhere | Slow test suite at scale | Mark parallel-safe tests (Step 3) |
| Forget loop-variable capture pre-Go 1.22 | All subtests share last iteration's value | `tt := tt` (Step 3) |
| Skip `-race` in CI | Race conditions ship to prod | Always `-race` (Step 10) |
| Use `assert` from testify everywhere | Stdlib is sufficient + idiomatic | Plain `if got != want { t.Errorf }` |
| Multiple `t.Errorf` in single sub-condition | Fail-fast loses context | One assertion per logical thing |

## Limitations

- No assertion library in stdlib — community uses `testify`/`stretchr/testify`
  for richer matchers (and that's idiomatic in Go ecosystems).
- No fixture concept — use `t.Cleanup` + helper functions.
- No parametrize beyond table-driven loops.
- No mocking library in stdlib — use interfaces + hand-written
  fakes (Go style) or `gomock` for codegen.

## References

- [go-test-pkg][go-test-pkg] — `testing` package documentation
- [go-subtests][go-subtests] — subtests + sub-benchmarks
- pkg.go.dev/cmd/go#hdr-Testing_flags — `go test` flags
- pkg.go.dev/testing#hdr-Fuzzing — fuzz testing
- github.com/jstemmer/go-junit-report — JUnit XML reporter
- [`ginkgo-tests`](../ginkgo-tests/SKILL.md),
  [`cargo-test`](../cargo-test/SKILL.md),
  [`rstest-tests`](../rstest-tests/SKILL.md) — sister tools
- [`test-code-conventions`](../../qa-test-review/skills/test-code-conventions/SKILL.md)
