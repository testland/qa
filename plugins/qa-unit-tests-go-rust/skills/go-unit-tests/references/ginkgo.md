# Ginkgo + Gomega - Go BDD testing (reference)

Companion reference for `go-unit-tests`. Consult for Kubernetes-ecosystem
projects (the community convention) or teams with a BDD culture
(rspec/mocha background). For non-BDD Go projects, stdlib `testing`
(SKILL.md) is the idiomatic choice.

Per [onsi.github.io/ginkgo][gn-docs]:

[gn-docs]: https://onsi.github.io/ginkgo/

## Install and bootstrap

```bash
go install github.com/onsi/ginkgo/v2/ginkgo@latest
go get github.com/onsi/ginkgo/v2
go get github.com/onsi/gomega/...

ginkgo bootstrap         # creates <package>_suite_test.go
ginkgo generate calc     # creates calc_test.go template
```

The bootstrap file registers the suite:

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

## Spec structure

```go
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

`var _ = Describe(...)` registers the spec at package init time. Hooks
(`BeforeSuite` / `AfterSuite`, `BeforeEach` / `AfterEach`,
`JustBeforeEach` / `JustAfterEach`) nest with `Describe`/`Context` -
inner `BeforeEach` runs in addition to outer ones ([gn-docs][gn-docs]).

An `It` block with no Gomega `Expect` passes silently - always assert.

## Gomega matchers

Per [onsi.github.io/gomega][gomega] - `Expect(actual).To(matcher)` and
`Expect(actual).NotTo(matcher)`:

[gomega]: https://onsi.github.io/gomega/

```go
Expect(value).To(Equal(expected))           // reflect.DeepEqual semantics
Expect(value).To(BeNil())
Expect(err).To(HaveOccurred())
Expect(err).To(MatchError("expected message"))
Expect(str).To(ContainSubstring("substring"))
Expect(str).To(MatchRegexp(`\d+`))
Expect(list).To(HaveLen(3))
Expect(list).To(ContainElement("alice"))
Expect(list).To(ConsistOf("alice", "bob"))  // unordered
Expect(value).To(BeNumerically(">", 0))
Expect(value).To(BeNumerically("~", 3.14, 0.01))  // tolerance
Expect(action).To(Panic())
Expect(channel).To(Receive(&value))
```

Async polling - `Eventually` polls until the condition holds;
`Consistently` verifies it stays true (use instead of sleep-based polls):

```go
Eventually(func() bool { return ready() }).Should(BeTrue())
Consistently(func() bool { return stable() }).Should(BeTrue())
```

## DescribeTable + Entry (parametrize)

```go
DescribeTable("Add",
    func(a, b, expected int) {
        Expect(calc.Add(a, b)).To(Equal(expected))
    },
    Entry("positive", 1, 2, 3),
    Entry("zero", 0, 0, 0),
    Entry("negative", -1, 1, 0),
)
```

## Focus, skip, parallel

`FDescribe` / `FIt` focus (only those run); `PDescribe` / `PIt` skip.
Parallel: `ginkgo -p ./...` (CPU count) or `-procs=4` - per-process, so
tests must be independent.

## CI integration

```yaml
- run: go install github.com/onsi/ginkgo/v2/ginkgo@latest
- run: ginkgo -p --cover --coverprofile=coverage.out --no-focus -r
- uses: codecov/codecov-action@v4
  with: { files: coverage.out }
```

`--no-focus` fails the build if any `F`-prefix specs exist (catches
debug-leftover focus). JUnit XML: `ginkgo --junit-report=junit.xml -r`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Ginkgo for a non-BDD codebase | Verbose vs stdlib `testing` | stdlib (SKILL.md) |
| Committed `FDescribe` / `FIt` | Suite runs only focused specs | `--no-focus` in CI |
| Sleep-based async assertions | Flaky | `Eventually` / `Consistently` |
| Heavy nesting (5+ levels) | Setup hard to reason about | Flatten with `Describe`+`It` |

## References

- [gn-docs][gn-docs] - Ginkgo documentation
- [gomega][gomega] - Gomega matchers reference
- github.com/onsi/ginkgo - repository
