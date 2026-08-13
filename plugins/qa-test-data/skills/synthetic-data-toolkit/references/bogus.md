# Bogus (.NET) - full workflow

Reference detail for [synthetic-data-toolkit](../SKILL.md). Bogus is the
canonical .NET test-data generator, ported from faker.js's spirit but typed
for the C#-first ecosystem ([bogus-readme][readme]). It uses **typed
`Faker<T>` builders** with fluent `.RuleFor` calls per property - the .NET
equivalent of combining Faker's value generation with a factory library's
referential integrity.

[readme]: https://github.com/bchavez/Bogus

## When to use

- The project is .NET (C# / F# / VB.NET).
- Tests need typed fixtures matching domain entities.
- The team prefers fluent / strongly-typed APIs over factory-as-DSL
  (FactoryBot-style).
- xUnit / NUnit / MSTest integration is required.

## Install

```pwsh
Install-Package Bogus
```

(Per [bogus-readme][readme]; via NuGet.)

For .NET CLI:

```bash
dotnet add package Bogus
```

## Authoring

### Typed faker builder

```csharp
using Bogus;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public DateTime CreatedAt { get; set; }
}

var faker = new Faker<User>()
    .RuleFor(u => u.Id,        f => f.IndexFaker)
    .RuleFor(u => u.Name,      f => f.Name.FullName())
    .RuleFor(u => u.Email,     f => f.Internet.Email())
    .RuleFor(u => u.CreatedAt, f => f.Date.Past());
```

(Adapted from [bogus-readme][readme].)

`f` is a `Faker` instance (lowercase) exposing the same data-set
modules as the JS / Python ports: `f.Name`, `f.Internet`, `f.Date`,
`f.Commerce`, `f.Address`, `f.Lorem`, `f.Random`, etc.

`f.IndexFaker` gives a sequential integer per generation - useful
for IDs that must be unique within a test.

### Strict mode (recommended)

```csharp
var faker = new Faker<User>()
    .StrictMode(true)
    .RuleFor(u => u.Id,        f => f.IndexFaker)
    .RuleFor(u => u.Name,      f => f.Name.FullName())
    .RuleFor(u => u.Email,     f => f.Internet.Email())
    .RuleFor(u => u.CreatedAt, f => f.Date.Past());
```

`.StrictMode(true)` causes Bogus to **fail at runtime if any property
of `T` lacks a `RuleFor`**. Recommended - it prevents silent fixture
drift when a model adds a new property and the factory isn't
updated.

### Computed and conditional rules

```csharp
var faker = new Faker<User>()
    .RuleFor(u => u.FirstName, f => f.Name.FirstName())
    .RuleFor(u => u.LastName,  f => f.Name.LastName())
    .RuleFor(u => u.FullName,  (f, u) => $"{u.FirstName} {u.LastName}")    // computed from already-set fields
    .RuleFor(u => u.IsActive,  f => f.Random.Bool(0.9f));                   // 90% active
```

The second-argument-form of `RuleFor` (`(f, u) => ...`) lets a rule
reference already-generated properties on the same instance - useful
for derived fields.

## Generation

Per [bogus-readme][readme]:

| Method                        | Returns                                          |
|-------------------------------|--------------------------------------------------|
| `faker.Generate()`            | One `T` instance.                                |
| `faker.Generate(N)`           | List of `N` instances.                            |
| `faker.GenerateBetween(min, max)` | Random count in `[min, max]`.                |
| `faker.GenerateLazy(N)`        | Lazy enumerable - generates on iteration; saves memory for large N. |

```csharp
var oneUser   = faker.Generate();           // single
var hundred   = faker.Generate(100);         // list of 100
var lazyTen   = faker.GenerateLazy(10);      // IEnumerable<User>; deferred
```

Use `GenerateLazy` when seeding a database with thousands of rows -
it streams instead of materializing.

## Seeding

```csharp
var faker = new Faker<Order>()
    .UseSeed(1338)
    .RuleFor(o => o.Item, f => f.Commerce.Product());
```

(Per [bogus-readme][readme].)

`UseSeed(int)` makes generation reproducible across runs - same
seed produces same data. Mirror the `faker-data` seeding guidance:
seed in test setup so failures reproduce.

For globally seeding the underlying randomizer (affecting any
non-`Faker<T>` direct calls):

```csharp
Randomizer.Seed = new Random(42);
```

## Locale support

```csharp
var faker = new Faker<User>("de")
    .RuleFor(u => u.Name, f => f.Name.FullName());
```

The locale code in the constructor switches data sets. Bogus ships
30+ locales; supported codes match Faker's conventions
(`en`, `de`, `ja`, `ko`, `ru`, `pt_BR`, etc.).

## Test framework integration

### xUnit

```csharp
public class UserTests
{
    private readonly Faker<User> _userFaker = new Faker<User>("en")
        .UseSeed(42)
        .StrictMode(true)
        .RuleFor(u => u.Name,  f => f.Name.FullName())
        .RuleFor(u => u.Email, f => f.Internet.Email());

    [Fact]
    public void User_HasName()
    {
        var user = _userFaker.Generate();
        Assert.NotEmpty(user.Name);
    }
}
```

NUnit and MSTest wire identically - Bogus is framework-agnostic.

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                       | Fix |
|-------------------------------------------------------------|---------------------------------------------------------------------|-----|
| `RuleFor` for some properties only, no `StrictMode`          | New property added; factory silently leaves it default; tests pass against unrealistic state. | Always `StrictMode(true)`. |
| Same `Faker<T>` instance shared across parallel tests       | xUnit runs collections in parallel; shared faker = race condition; flaky failures. | Construct per-test (`new Faker<T>`) or annotate with `[Collection("NoParallel")]`. |
| Hard-coded `UseSeed(42)` in every factory                   | Same data in every test = N tests assert against the same name; coincidental passes. | Per-test seed or per-collection seed; document the convention. |
| `Generate(10000)` in unit tests                              | Slow; CI cost adds up.                                              | Use `GenerateLazy(10000)` or seed the DB via raw SQL bulk insert. |
| Inline `new Faker()` for every property                     | The same generator can't share state across properties; randomized values mismatch. | One `Faker<T>` builder per entity; chain `RuleFor` calls. |

## Limitations

- **.NET-only.** For other languages, see `faker-data`
  (Python/JS/Ruby), [mimesis.md](mimesis.md) (Python), and
  [factory-bot.md](factory-bot.md) (Ruby).
- **PRNG sequence varies across major versions.** Pin the package
  version for deterministic tests.
- **No native factory orchestration for graphs.** Composing a User
  with three Orders requires explicit chaining; there's no
  FactoryBot-style `after(:create)` block.

## References

- [bogus-readme][readme] - canonical: install, `Faker<T>`, `RuleFor`,
  `Generate` / `GenerateBetween` / `GenerateLazy`, `UseSeed`.
- `faker-data` - the family default for plain field values.
