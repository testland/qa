# Gomega matchers reference

Per [Gomega documentation](https://onsi.github.io/gomega/).

`Expect(actual).To(matcher)` and its negation `Expect(actual).NotTo(matcher)`
are the core assertion forms.

## Equality and nil

```go
Expect(value).To(Equal(expected))
Expect(value).NotTo(Equal(unexpected))
Expect(value).To(BeNil())
Expect(value).To(BeTrue())
```

## Strings

```go
Expect(str).To(ContainSubstring("substring"))
Expect(str).To(MatchRegexp(`\d+`))
```

## Collections

```go
Expect(list).To(HaveLen(3))
Expect(list).To(ContainElement("alice"))
Expect(list).To(ConsistOf("alice", "bob"))   // unordered
```

## Numeric

```go
Expect(value).To(BeNumerically(">", 0))
Expect(value).To(BeNumerically("~", 3.14, 0.01))   // within tolerance
```

## Panics, errors, channels

```go
Expect(action).To(Panic())
Expect(err).To(MatchError("expected message"))
Expect(channel).To(Receive(&value))
```

## Async polling

```go
Eventually(func() bool { return ready() }).Should(BeTrue())
Consistently(func() bool { return stable() }).Should(BeTrue())
```

`Eventually` polls until the condition holds; `Consistently` polls to verify
it stays true. Both suit async and concurrent code where a value settles over
time rather than immediately.
