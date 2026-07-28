# FluentAssertions matcher catalog

Complete `.Should()` matcher reference. Core examples live in SKILL.md Step 3; this file is the full catalog. Per [fluentassertions.com/introduction](https://fluentassertions.com/introduction).

## Equality

```csharp
value.Should().Be(expected);
value.Should().NotBe(expected);
value.Should().BeNull();
value.Should().NotBeNull();
value.Should().BeSameAs(other);     // reference equality
```

## Numeric

```csharp
n.Should().BeGreaterThan(0);
n.Should().BeLessThanOrEqualTo(100);
d.Should().BeApproximately(3.14, 0.01);
```

## String

```csharp
s.Should().StartWith("prefix");
s.Should().EndWith("suffix");
s.Should().Contain("substring");
s.Should().Match("*wildcard*");
s.Should().MatchRegex(@"\d+");
s.Should().NotBeNullOrEmpty();
```

## Collections

```csharp
list.Should().HaveCount(3);
list.Should().Contain("alice");
list.Should().NotContain("eve");
list.Should().ContainInOrder("alice", "bob");
list.Should().BeEquivalentTo(other);   // any order
list.Should().AllSatisfy(x => x.Should().BePositive());
```

## Type checks

```csharp
result.Should().BeOfType<Success>();
result.Should().BeAssignableTo<IResult>();
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

## Boolean + null

```csharp
flag.Should().BeTrue();
flag.Should().BeFalse();
opt.Should().BeNull();
opt.Should().NotBeNull().And.NotBeEmpty();
```

## Custom predicates

```csharp
user.Should().Satisfy(u => u.Email.Contains("@") && u.Age >= 18);
```

## `BeEquivalentTo` deep equality

Structural comparison; the most powerful matcher.

```csharp
var actual = new User { Id = 1, Name = "Alice", Address = new Address { City = "NYC" } };
var expected = new User { Id = 1, Name = "Alice", Address = new Address { City = "NYC" } };
actual.Should().BeEquivalentTo(expected);   // passes (deep equal)

// Across different types (record vs class):
var dto = new UserDto { Id = 1, Name = "Alice" };
user.Should().BeEquivalentTo(dto, opts => opts
    .Excluding(u => u.PasswordHash));   // ignore field

// With options
actual.Should().BeEquivalentTo(expected, opts => opts
    .Excluding(x => x.Timestamp)
    .ComparingByMembers<MyType>()
    .WithStrictOrdering()
);
```

Options control: `Excluding`, `Including`, `ComparingByMembers`, `WithStrictOrdering`, `WithoutStrictOrdering`, `IgnoringCyclicReferences`.
