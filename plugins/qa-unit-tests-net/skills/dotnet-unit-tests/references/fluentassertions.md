# FluentAssertions - fluent .NET assertions (reference)

Companion reference for `dotnet-unit-tests`. Per [fluentassertions.com][fa],
FluentAssertions is the de facto fluent-assertion library for .NET - it
pairs with xUnit, NUnit, or MSTest (auto-detects the framework and throws
framework-specific exceptions), so assertion code survives a move between
frameworks.

[fa]: https://fluentassertions.com/

**Important license change note:** from v8, "commercial use requires a
paid license", while v8+ stays "free for open-source projects and
non-commercial use"; v7 "will remain fully open-source indefinitely"
(per [fluentassertions.com/releases](https://fluentassertions.com/releases/)).
Commercial projects either buy a v8+ license or pin to v7; open-source
and non-commercial projects can use v8+ free.

## Install

```bash
dotnet add package FluentAssertions                    # current v8+ (see license note above)
dotnet add package FluentAssertions --version 7.0.0    # pin v7 for fully-OSS commercial use
```

## Basic syntax

Per [fluentassertions.com/introduction][fa-intro] - `.Should()` is the
fluent entry point:

[fa-intro]: https://fluentassertions.com/introduction

```csharp
using FluentAssertions;

result.Should().Be(42);
list.Should().HaveCount(3);
```

## Matcher catalog

```csharp
// Equality
value.Should().Be(expected);
value.Should().NotBe(expected);
value.Should().BeNull();
value.Should().BeSameAs(other);     // reference equality

// Numeric
n.Should().BeGreaterThan(0);
n.Should().BeLessThanOrEqualTo(100);
d.Should().BeApproximately(3.14, 0.01);

// String
s.Should().StartWith("prefix");
s.Should().Contain("substring");
s.Should().Match("*wildcard*");
s.Should().MatchRegex(@"\d+");
s.Should().NotBeNullOrEmpty();

// Collections
list.Should().HaveCount(3);
list.Should().Contain("alice");
list.Should().NotContain("eve");
list.Should().ContainInOrder("alice", "bob");
list.Should().AllSatisfy(x => x.Should().BePositive());

// Type checks
result.Should().BeOfType<Success>();
result.Should().BeAssignableTo<IResult>();

// Boolean
flag.Should().BeTrue();

// Custom predicates
user.Should().Satisfy(u => u.Email.Contains("@") && u.Age >= 18);
```

## Exceptions

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

Always specify `WithMessage` - a type-only assertion passes for the wrong
failure of the right type.

## Chaining

`.And` chains assertions; `.Which` accesses the result for further
assertion:

```csharp
list.Should().HaveCount(3).And.Contain("alice").And.NotContain("eve");

result.Should().BeOfType<Success>()
              .Which.Value.Should().Be(42);
```

## `BeEquivalentTo` deep equality

Structural comparison - the most powerful matcher
(fluentassertions.com/objectgraphs):

```csharp
actual.Should().BeEquivalentTo(expected);   // deep equal, order-independent

// Across different types (record vs class), excluding fields:
user.Should().BeEquivalentTo(dto, opts => opts
    .Excluding(u => u.PasswordHash));

// With options
actual.Should().BeEquivalentTo(expected, opts => opts
    .Excluding(x => x.Timestamp)
    .ComparingByMembers<MyType>()
    .WithStrictOrdering()
);
```

Options: `Excluding`, `Including`, `ComparingByMembers`,
`WithStrictOrdering`, `WithoutStrictOrdering`, `IgnoringCyclicReferences`.

## Migration from Assert.X

- `Assert.AreEqual(expected, actual)` → `actual.Should().Be(expected)`
- `Assert.IsTrue(condition)` → `condition.Should().BeTrue()`
- `Assert.IsInstanceOfType(obj, typeof(MyClass))` → `obj.Should().BeOfType<MyClass>()`
- `Assert.ThrowsException<E>(action)` → `action.Should().Throw<E>()`

Mechanical, low-cost; the benefit is richer failure messages (object
structure shown, e.g. `Expected list to have 4 items, but found 3:
["alice", "bob", "charlie"]`) plus chainability.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mix `Assert.X` and `.Should()` in one suite | Reader confusion | Pick one + lint enforcement |
| `BeEquivalentTo` without options on volatile fields | Compares fields you don't care about; brittle | `Excluding(...)` |
| Ship v8+ commercially without a paid license | License violation | Buy a v8+ license or pin v7 |
| `value.Should().Be(true)` | Loses semantic clarity | `BeTrue()` / `BeFalse()` |

## Limitations

- `BeEquivalentTo` edge cases (cyclic refs, polymorphism) need explicit
  options.
- `.Should()` can clash with other libraries' extension methods (rare).
- C#-first; F# usage is less ergonomic.

## References

- [fa][fa] - FluentAssertions landing
- [fa-intro][fa-intro] - introduction guide
- fluentassertions.com/objectgraphs - BeEquivalentTo deep dive
- fluentassertions.com/releases - v8 license change
- github.com/fluentassertions/fluentassertions - repository
