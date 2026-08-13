---
name: go-unit-tests
description: "Go unit testing with the stdlib `testing` package - `func TestXxx(t *testing.T)` convention, the table-driven idiom with `t.Run` subtests, `t.Parallel()`, benchmarks (`BenchmarkXxx` + benchstat), examples (`ExampleXxx`), native fuzzing (`FuzzXxx`, Go 1.18+), coverage (`-cover` / `-coverprofile` + threshold gating), build tags, `t.Helper()` / `t.Cleanup`, and `-race` CI. Includes framework choice (stdlib `testing` is the idiomatic default; Ginkgo BDD for Kubernetes-ecosystem projects via references) and test-authoring conventions (framework detection from go.sum + existing suite files, `_test.go` placement, `t.Errorf` vs `t.Fatalf`). References cover Ginkgo + Gomega and Go mocking (gomock, testify/mock). Use for any Go unit-test task: writing table-driven tests, benchmarks, fuzz targets, coverage gates, or CI wiring."
---

# go-unit-tests

## Overview

Per [pkg.go.dev/testing][go-test-pkg]:

[go-test-pkg]: https://pkg.go.dev/testing

Go's `testing` package is stdlib - no separate install, no configuration
file. The single binary `go test` discovers, builds, and runs tests via
convention: `_test.go` suffix; `TestXxx` / `BenchmarkXxx` / `FuzzXxx` /
`ExampleXxx` function-name prefixes. The table-driven idiom is built into
the language style, and benchmarks + fuzzing (Go 1.18+) are native.

## Choosing a framework

1. **stdlib `testing` is the idiomatic default** - zero install, zero
   config, works wherever Go works.
2. **Ginkgo + Gomega** when the project lives in the Kubernetes ecosystem
   (`k8s.io/*`, `sigs.k8s.io/*`, `knative.dev/*` in go.mod) or the team
   has an explicit BDD culture → [references/ginkgo.md](references/ginkgo.md).
3. **Match the existing convention**: Ginkgo in `go.sum` plus a
   `*_suite_test.go` bootstrap (or `Describe`/`Context`/`It` blocks in
   existing tests) → stay on Ginkgo; otherwise stdlib. Never switch
   frameworks mid-project.
4. **Mocking across interface boundaries** → [references/go-mocking.md](references/go-mocking.md)
   (gomock codegen vs testify/mock hand-written stubs).

## Step 1 - First test

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

```bash
go test ./...           # all packages recursively
go test -v              # verbose
go test -run TestAdd    # specific test by name pattern
```

## Step 2 - Table-driven tests (the Go idiom)

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

`t.Run` creates subtests with hierarchical names (`TestAdd/positive`),
individually filterable via `go test -run TestAdd/positive`. A bare loop
without `t.Run` reports every failure under the parent name only.

## Step 3 - t.Parallel()

```go
func TestSomethingSlow(t *testing.T) {
    t.Parallel()   // marks this test as parallel-safe
}
```

Parallel tests run concurrently with other parallel tests in the same
package. In subtest loops pre-Go 1.22, capture the loop variable
(`tt := tt`) or all subtests share the last iteration's value.

## Step 4 - Benchmarks

```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(1, 2)
    }
}
```

```bash
go test -bench=. -benchmem                # with allocation tracking
go test -bench=. -count=10 > old.txt      # statistical comparison:
benchstat old.txt new.txt
```

## Step 5 - Examples (executable docs)

```go
func ExampleAdd() {
    fmt.Println(Add(1, 2))
    // Output: 3
}
```

The `// Output:` comment is the assertion; examples appear in `go doc`.

## Step 6 - Native fuzzing (Go 1.18+)

Per [pkg.go.dev/testing#hdr-Fuzzing](https://pkg.go.dev/testing#hdr-Fuzzing):

```go
func FuzzAdd(f *testing.F) {
    f.Add(1, 2)   // seed corpus
    f.Add(-1, 1)

    f.Fuzz(func(t *testing.T, a, b int) {
        c := Add(a, b)
        if c-a != b {
            t.Errorf("Add(%d, %d) = %d; expected invariant", a, b, c)
        }
    })
}
```

```bash
go test -fuzz=FuzzAdd -fuzztime=30s
```

Failures are cached at `testdata/fuzz/FuzzAdd/`; subsequent `go test`
runs replay those cases as regression tests.

## Step 7 - Coverage

```bash
go test -cover                                # summary
go test -coverprofile=coverage.out -coverpkg=./... ./...
go tool cover -html=coverage.out              # browser view
go tool cover -func=coverage.out              # per-function
```

No built-in threshold flag - gate via shell:

```bash
COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print substr($3, 1, length($3)-1)}')
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
    echo "Coverage $COVERAGE% below 80% threshold"; exit 1
fi
```

## Step 8 - Build tags and helpers

```go
//go:build integration
```

`go test -tags=integration ./...` runs per-environment suites without a
separate folder structure.

```go
func setupTest(t *testing.T) *Database {
    t.Helper()   // failure messages point to the caller
    db := openTestDB()
    t.Cleanup(func() { db.Close() })
    return db
}
```

## Step 9 - CI integration

```yaml
- run: go test -race -coverprofile=coverage.out -v ./...
- uses: codecov/codecov-action@v4
  with: { files: coverage.out }
```

`-race` enables the race detector - standard practice for any Go project
with concurrency. JUnit XML for `junit-xml-analysis` (qa-test-reporting):

```bash
go install github.com/jstemmer/go-junit-report/v2@latest
go test -v ./... | go-junit-report > junit.xml
```

## Authoring conventions

When authoring a new unit test in an existing project:

1. **Detect the framework**: default to stdlib `testing` unless Ginkgo is
   in `go.sum` AND an existing `*_suite_test.go` (or `Describe` blocks)
   is present; when signals differ per sub-package, follow the target's
   sub-package. Conflicting signals → stop and ask.
2. **Placement**: test files MUST end in `_test.go` and live in the same
   directory as the source ([go-test-pkg][go-test-pkg]). Same-package =
   white-box (unexported access); `package <name>_test` = black-box.
3. **`t.Errorf` vs `t.Fatalf`**: `t.Errorf` marks failed but continues;
   `t.Fatalf` stops the test. Use `t.Fatalf` only when a broken
   precondition would make later assertions panic or produce noise.
4. **One spec → one new `TestXxx` function**; never modify existing tests,
   never fabricate exported symbols the package does not declare, no smoke
   asserts when the spec names a concrete value.
5. **Refuse universally-quantified specs** ("for all valid inputs") -
   property-based scope (qa-property-based plugin); Go's native fuzzing
   (Step 6) covers crash/invariant hunting on generated inputs.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Table loop without `t.Run` | Failures not individually named or filterable | Subtests (Step 2) |
| Forget loop-variable capture pre-Go 1.22 | All subtests see the last iteration | `tt := tt` (Step 3) |
| Skip `-race` in CI | Data races ship to prod | Always `-race` (Step 9) |
| `t.Parallel()` nowhere | Slow suite at scale | Mark parallel-safe tests (Step 3) |
| Multiple checks in one `t.Errorf` | Fail-fast loses context | One assertion per logical thing |

## Limitations

- No assertion library in stdlib - `testify` is the common ecosystem
  addition; plain `if got != want` is idiomatic.
- No fixture concept - use `t.Cleanup` + helper functions.
- No parametrize beyond table-driven loops.
- No mocking in stdlib - interfaces + hand-written fakes, or the codegen
  tools in [references/go-mocking.md](references/go-mocking.md).

## References

- [go-test-pkg][go-test-pkg] - `testing` package documentation
- [go-subtests][go-subtests] - subtests + sub-benchmarks
- pkg.go.dev/cmd/go#hdr-Testing_flags - `go test` flags
- github.com/jstemmer/go-junit-report - JUnit XML reporter
- [references/ginkgo.md](references/ginkgo.md) - Ginkgo BDD + Gomega
- [references/go-mocking.md](references/go-mocking.md) - gomock +
  testify/mock
- `rust-unit-tests` - sister umbrella for Rust
- `test-code-conventions` (qa-test-review) - test code hygiene
