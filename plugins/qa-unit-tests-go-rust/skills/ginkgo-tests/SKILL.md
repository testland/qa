---
name: ginkgo-tests
description: "Configures and runs Ginkgo - Go BDD test framework with `Describe` / `Context` / `It` nesting; `BeforeEach` / `AfterEach` / `JustBeforeEach` / `JustAfterEach` lifecycle; Gomega matchers DSL (`Expect(actual).To(Equal(expected))`); parallel execution via `-p`; focus (`F` prefix) + skip (`P` prefix); `DescribeTable` + `Entry` for parametrized tests; `ginkgo` CLI tool. Use when working with Go on a BDD-style test suite (Kubernetes-ecosystem standard)."
rating: 22
d6: 4
---

# ginkgo-tests

## Overview

Per [onsi.github.io/ginkgo][gn-docs]:

[gn-docs]: https://onsi.github.io/ginkgo/

Ginkgo is a Go BDD framework. The Kubernetes ecosystem standardized
on Ginkgo + Gomega for its test suites; it's the most-used Go BDD
framework in 2026.

For non-BDD Go projects, [`go-test`](../go-test/SKILL.md) (stdlib)
is the idiomatic choice. Ginkgo fits when:

- The team has a BDD culture (rspec / mocha background).
- Working on Kubernetes / CNCF projects (community convention).
- Hierarchical test organization with `Describe`/`Context`/`It`
  reads better than flat `func TestXxx`.

## Step 1 - Install

```bash
go install github.com/onsi/ginkgo/v2/ginkgo@latest
go get github.com/onsi/ginkgo/v2
go get github.com/onsi/gomega/...
```

## Step 2 - Bootstrap

In the package to test:

```bash
ginkgo bootstrap         # creates <package>_suite_test.go
ginkgo generate calc     # creates calc_test.go template
```

`<package>_suite_test.go`:

```go
package calc_test

import (
    "testing"

    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"
)

func TestCalc(t *testing.T) {
    RegisterFailHandler(Fail)
    RunSpecs(t, "Calc Suite")
}
```

The `func TestCalc(t *testing.T)` bridges Ginkgo into the standard
`go test` runner.

## Step 3 - Spec structure

```go
package calc_test

import (
    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"
    "myproject/calc"
)

var _ = Describe("Calculator", func() {
    var c *calc.Calculator

    BeforeEach(func() {
        c = calc.New()
    })

    Describe("Add", func() {
        Context("with positive numbers", func() {
            It("adds correctly", func() {
                Expect(c.Add(1, 2)).To(Equal(3))
            })
        })

        Context("with overflow", func() {
            It("returns error", func() {
                _, err := c.AddSafe(math.MaxInt, 1)
                Expect(err).To(HaveOccurred())
            })
        })
    })
})
```

The `var _ = Describe(...)` pattern registers the spec at package
init time. Ginkgo discovers + runs registered specs.

## Step 4 - Lifecycle hooks

Per [gn-docs][gn-docs]:

```go
BeforeSuite(func() { /* once before all specs */ })
AfterSuite(func() { /* once after all specs */ })
BeforeEach(func() { /* before each It in scope */ })
AfterEach(func() { /* after each It in scope */ })
JustBeforeEach(func() { /* after BeforeEach but before It */ })
JustAfterEach(func() { /* after It but before AfterEach */ })
```

Hooks nest with `Describe`/`Context` - `BeforeEach` in nested
`Context` runs in addition to outer `BeforeEach`.

## Step 5 - Gomega matchers

Per [onsi.github.io/gomega][go-gomega]:

[go-gomega]: https://onsi.github.io/gomega/

```go
Expect(value).To(Equal(expected))
Expect(value).NotTo(Equal(unexpected))
Expect(value).To(BeNil())
Expect(value).To(BeTrue())
Expect(string).To(ContainSubstring("substring"))
Expect(string).To(MatchRegexp(`\d+`))
Expect(list).To(HaveLen(3))
Expect(list).To(ContainElement("alice"))
Expect(list).To(ConsistOf("alice", "bob"))   // unordered
Expect(value).To(BeNumerically(">", 0))
Expect(value).To(BeNumerically("~", 3.14, 0.01))
Expect(action).To(Panic())
Expect(err).To(MatchError("expected message"))
Expect(channel).To(Receive(&value))
Eventually(func() bool { return ready() }).Should(BeTrue())
Consistently(func() bool { return stable() }).Should(BeTrue())
```

`Eventually` polls until the condition holds; `Consistently` polls
to verify it stays true. Useful for async + concurrent code.

## Step 6 - DescribeTable + Entry

```go
DescribeTable("Add",
    func(a, b, expected int) {
        Expect(calc.Add(a, b)).To(Equal(expected))
    },
    Entry("positive", 1, 2, 3),
    Entry("zero", 0, 0, 0),
    Entry("negative", -1, 1, 0),
    Entry("large", 100, 200, 300),
)
```

`DescribeTable` is Ginkgo's parametrize equivalent of pytest's
`@pytest.mark.parametrize` or JUnit's `@ParameterizedTest`.

## Step 7 - Focus + skip

```go
FDescribe("focused", func() { ... })   // F prefix: only this runs
PDescribe("pending", func() { ... })   // P prefix: skipped
```

Same for `FContext`/`PContext`, `FIt`/`PIt`, `FDescribeTable`/`PDescribeTable`.

CI gating: lint forbid `F` prefixes via `ginkgo --no-focus` (errors
if any focused specs in suite).

## Step 8 - Parallel execution

```bash
ginkgo -p ./...                 # parallel; uses CPU count
ginkgo -procs=4 ./...           # explicit process count
```

Each parallel process runs a subset of specs. Tests must be
independent - shared state breaks parallel runs.

## Step 9 - CI integration

```yaml
- run: go install github.com/onsi/ginkgo/v2/ginkgo@latest
- run: ginkgo -p --cover --coverprofile=coverage.out --no-focus -r
- uses: codecov/codecov-action@v4
  with: { files: coverage.out }
```

`--no-focus` fails the build if any `F`-prefix specs exist (catches
debug-leftover focus).

For JUnit XML output:

```bash
ginkgo --junit-report=junit.xml -r
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use Ginkgo for non-BDD codebase | Verbose vs stdlib `testing` | Use [`go-test`](../go-test/SKILL.md) for non-BDD |
| Commit `FDescribe` / `FIt` accidentally | Suite runs only focused specs | `--no-focus` flag (Step 9) |
| Skip `Eventually` for async assertions | Sleep-based polls are flaky | Use `Eventually`/`Consistently` (Step 5) |
| Heavy nesting (5+ levels) | Test setup hard to reason about | Flatten with `Describe`+`It` |
| Use `.` import for both Ginkgo + Gomega without thinking | Namespace pollution | Standard convention; document |

## Limitations

- BDD verbosity vs stdlib `testing` - pays off only when tests benefit
  from hierarchical grouping.
- Adds two dependencies (Ginkgo + Gomega) to a Go project.
- Kubernetes-ecosystem heavy convention; less common outside that
  community.
- Parallel execution is per-process, not per-spec - startup cost
  amplifies for small suites.

## References

- [gn-docs][gn-docs] - Ginkgo documentation
- [go-gomega][go-gomega] - Gomega matchers reference
- onsi.github.io - landing
- github.com/onsi/ginkgo - repository
- [`go-test`](../go-test/SKILL.md),
  [`cargo-test`](../cargo-test/SKILL.md),
  [`rstest-tests`](../rstest-tests/SKILL.md) - sister tools
- [`test-code-conventions`](../../../qa-test-review/skills/test-code-conventions/SKILL.md)
