---
name: fluentassertions
description: "Reference for FluentAssertions - the canonical .NET fluent-assertion library pairable with xUnit / NUnit / MSTest; provides `.Should()` extension API (`.Should().Be()`, `.Should().BeOfType()`, `.Should().Throw()`, `.Should().BeEquivalentTo()` for deep equality, `.Should().Satisfy()` for predicates, `.Should().BeApproximately()` for floats); rich failure messages with object structure visualization. Covers the v8 license change: v8+ is free for open-source and non-commercial use but requires a paid license for commercial use, while v7 remains fully open-source. Use when a .NET test project needs deep object comparison or better failure output than `Assert.X` gives, when assertions must survive a move between xUnit / NUnit / MSTest, or when picking between v7 and v8+ on license grounds."
---

# fluentassertions

## Overview

Per [fluentassertions.com][fa]:

[fa]: https://fluentassertions.com/

FluentAssertions is the de facto fluent-assertion library for .NET.
Works with any of `xunit-tests`,
`nunit-tests`, `mstest-tests`.

**Important license change note:** from v8, "commercial use requires a
paid license", while v8+ stays "free for open-source projects and
non-commercial use"; v7 "will remain fully open-source indefinitely"
(per [fluentassertions.com/releases](https://fluentassertions.com/releases/)).
Commercial projects either buy a v8+ license or pin to v7; open-source
and non-commercial projects can use v8+ free.

This skill is a **reference** - defines the matcher
catalog; doesn't run tests. Pair with one of the test frameworks.

## When to use

- .NET project using any test framework (xUnit / NUnit / MSTest).
- Need richer assertion failure messages than the built-in
  `Assert.X` methods.
- Deep-equality checking via `BeEquivalentTo`.
- Migrating between test frameworks (assertion code stays the same).

## Step 1 - Install

```bash
# Pin to v7 to avoid the v8+ paid license in a commercial project
dotnet add package FluentAssertions --version 7.0.0
```

Or current (free for OSS / non-commercial, paid for commercial):

```bash
dotnet add package FluentAssertions
```

## Step 2 - Basic syntax

```csharp
using FluentAssertions;

result.Should().Be(42);
list.Should().HaveCount(3);
string.Should().StartWith("Hello");
exception.Should().Be<ArgumentNullException>();
```

The `.Should()` extension method provides the fluent entry-point.

## Step 3 - Matchers catalog

Per [fluentassertions.com/introduction][fa-intro]:

[fa-intro]: https://fluentassertions.com/introduction

**Equality:**

```csharp
value.Should().Be(expected);
value.Should().NotBe(expected);
value.Should().BeNull();
value.Should().NotBeNull();
value.Should().BeSameAs(other);     // reference equality
```

**Numeric:**

```csharp
n.Should().BeGreaterThan(0);
n.Should().BeLessThanOrEqualTo(100);
d.Should().BeApproximately(3.14, 0.01);
```

**String:**

```csharp
s.Should().StartWith("prefix");
s.Should().EndWith("suffix");
s.Should().Contain("substring");
s.Should().Match("*wildcard*");
s.Should().MatchRegex(@"\d+");
s.Should().NotBeNullOrEmpty();
```

**Collections:**

```csharp
list.Should().HaveCount(3);
list.Should().Contain("alice");
list.Should().NotContain("eve");
list.Should().ContainInOrder("alice", "bob");
list.Should().BeEquivalentTo(other);   // any order
list.Should().AllSatisfy(x => x.Should().BePositive());
```

**Type checks:**

```csharp
result.Should().BeOfType<Success>();
result.Should().BeAssignableTo<IResult>();
```

**Object equivalence (deep):**

```csharp
actual.Should().BeEquivalentTo(expected);

// With options
actual.Should().BeEquivalentTo(expected, opts => opts
    .Excluding(x => x.Timestamp)
    .ComparingByMembers<MyType>()
    .WithStrictOrdering()
);
```

**Exceptions:**

```csharp
Action act = () => DoSomething();
act.Should().Throw<ArgumentException>()
   .WithMessage("*invalid*")
   .Where(e => e.ParamName == "name");

// Async
Func<Task> asyncAct = async () => await DoSomethingAsync();
await asyncAct.Should().ThrowAsync<HttpRequestException>();

// Should NOT throw
act.Should().NotThrow();
```

**Boolean + null:**

```csharp
flag.Should().BeTrue();
flag.Should().BeFalse();
opt.Should().BeNull();
opt.Should().NotBeNull().And.NotBeEmpty();
```

**Custom predicates:**

```csharp
user.Should().Satisfy(u => u.Email.Contains("@") && u.Age >= 18);
```

## Step 4 - Combining matchers

`.And` chains assertions:

```csharp
list.Should().HaveCount(3).And.Contain("alice").And.NotContain("eve");
```

`.Which` accesses the result for further assertion:

```csharp
result.Should().BeOfType<Success>()
              .Which.Value.Should().Be(42);
```

## Step 5 - Failure messages

FluentAssertions failure output is rich:

```
Expected list to have 4 items, but found 3:
  ["alice", "bob", "charlie"]
```

vs vanilla `Assert.AreEqual(4, list.Count)`:

```
Expected: 4
But was: 3
```

The difference matters for debug velocity.

## Step 6 - `BeEquivalentTo` deep equality

Most powerful matcher; structural comparison:

```csharp
var actual = new User { Id = 1, Name = "Alice", Address = new Address { City = "NYC" } };
var expected = new User { Id = 1, Name = "Alice", Address = new Address { City = "NYC" } };
actual.Should().BeEquivalentTo(expected);   // passes (deep equal)

// Even with different types (record vs class):
var dto = new UserDto { Id = 1, Name = "Alice" };
user.Should().BeEquivalentTo(dto, opts => opts
    .Excluding(u => u.PasswordHash));   // ignore field
```

Options control: `Excluding`, `Including`, `ComparingByMembers`,
`WithStrictOrdering`, `WithoutStrictOrdering`, `IgnoringCyclicReferences`.

## Step 7 - Migration considerations

For migration FROM:

- `Assert.AreEqual(expected, actual)` → `actual.Should().Be(expected)`
- `Assert.IsTrue(condition)` → `condition.Should().BeTrue()`
- `Assert.IsInstanceOfType(obj, typeof(MyClass))` → `obj.Should().BeOfType<MyClass>()`
- `Assert.ThrowsException<E>(action)` → `action.Should().Throw<E>()`

Migration cost: low (mechanical). Migration benefit: richer
failure messages + chainable assertions.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mix `Assert.X` and `.Should()` styles in same suite | Reader confusion | Pick one + lint enforcement |
| Long `BeEquivalentTo` chains without options | Compares fields you don't care about; brittle | Use `Excluding` to scope (Step 6) |
| Ship v8+ in a commercial project without a paid license | License violation | Buy a v8+ license or pin v7 (Step 1) |
| `value.Should().Be(true)` instead of `BeTrue()` | Loses semantic clarity | Use `BeTrue()` (Step 3) |
| Skip `WithMessage` on exception assertions | Pass for wrong exception type | Always specify expected message (Step 3) |

## Limitations

- License change v8+: paid for commercial use, free for OSS /
  non-commercial. Pin v7 to stay fully OSS-licensed.
- Some edge cases in `BeEquivalentTo` (cyclic refs, polymorphism)
  need explicit options.
- `.Should()` extension can clash with other libraries' extensions
  (rare).
- F#-friendly but C#-first; F# usage less ergonomic.

## References

- [fa][fa] - FluentAssertions landing
- [fa-intro][fa-intro] - Introduction guide
- fluentassertions.com/objectgraphs - BeEquivalentTo deep dive
- github.com/fluentassertions/fluentassertions - repository
- v7 license note: github.com/fluentassertions/fluentassertions/discussions
- `xunit-tests`,
  `nunit-tests`,
  `mstest-tests` - sister tools (test runners)
- `test-code-conventions`
