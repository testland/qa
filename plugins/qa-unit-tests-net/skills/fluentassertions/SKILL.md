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
dotnet add package FluentAssertions                    # current v8+ (see Overview on licensing)
dotnet add package FluentAssertions --version 7.0.0    # pin v7 for fully-OSS commercial use
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

Per [fluentassertions.com/introduction][fa-intro]. Core matchers (full catalog in [references/matchers.md](references/matchers.md)):

[fa-intro]: https://fluentassertions.com/introduction

```csharp
value.Should().Be(expected);                         // equality
value.Should().BeNull();
n.Should().BeGreaterThan(0);                         // numeric
s.Should().StartWith("prefix");                      // string
list.Should().HaveCount(3).And.Contain("alice");     // collections
result.Should().BeOfType<Success>();                 // type
act.Should().Throw<ArgumentException>().WithMessage("*invalid*");   // exceptions
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

Failure output shows the object structure, unlike `Assert.AreEqual`:

```
Expected list to have 4 items, but found 3:
  ["alice", "bob", "charlie"]
```

## Step 6 - `BeEquivalentTo` deep equality

Structural (deep) comparison; the most powerful matcher:

```csharp
actual.Should().BeEquivalentTo(expected);   // deep equal, order-independent
```

Cross-type comparison and options (`Excluding`, `Including`, `ComparingByMembers`,
`WithStrictOrdering`, `IgnoringCyclicReferences`): [references/matchers.md](references/matchers.md).

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
