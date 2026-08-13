---
name: synthetic-data-toolkit
description: "Umbrella for the synthetic test data generators beyond plain Faker - FactoryBot (Ruby factories with traits, associations, and build / create / build_stubbed strategies), Mimesis (fast type-hinted Python generator with the Schema/Field bulk pattern and 46 locales), and Bogus (.NET typed `Faker<T>` builders with `.RuleFor` / `StrictMode` / `UseSeed`). Picks the right generator by language and job, shows side-by-side equivalents of the same fixture across all four ecosystems, and carries each tool's full workflow in references/ (factory-bot.md, mimesis.md, bogus.md). faker-data stays the default for plain field values in Python / JS / Ruby; use this skill when the project needs typed factory orchestration, .NET fixtures, or a documented \"which tool should I use\" decision."
---

# synthetic-data-toolkit

## Overview

Synthetic-data generation has the same conceptual job in every
language: produce realistic field values, optionally compose them
into typed object graphs. But the canonical library differs per
language. This umbrella routes the team to the right one, shows
side-by-side equivalents so a reviewer recognizes the patterns
regardless of language, and carries the full per-tool workflows
(install, authoring, seeding, anti-patterns) in `references/`.

## When to use

- Starting test-data work on a new project; the team is choosing a
  library.
- The project needs **typed factory orchestration** (FactoryBot /
  Bogus) or a **.NET / mimesis-specific** workflow.
- A polyglot codebase needs equivalent fixture patterns across
  multiple languages.
- An RFC or onboarding doc needs "here's how we do test data, in
  one page."

If the project just needs plain field values in Python / JS / Ruby,
defer to `faker-data` - the default of the family. The per-tool
workflows this umbrella carries:

- [references/factory-bot.md](references/factory-bot.md) - Ruby
  FactoryBot (factories, traits, associations, build strategies).
- [references/mimesis.md](references/mimesis.md) - Python mimesis
  (providers, Generic, Schema/Field bulk generation).
- [references/bogus.md](references/bogus.md) - .NET Bogus
  (`Faker<T>` builders, `StrictMode`, `Generate*`, `UseSeed`).

## Dispatch by language

```
Project language?
├── Python
│   ├── Need typed-dict / schema-based bulk generation?
│   │   └── Yes → references/mimesis.md (faster + typed schema-Field pattern)
│   └── No  → faker-data (Python `faker`, larger ecosystem)
├── JavaScript / TypeScript
│   ├── Browser or Node?  → faker-data (`@faker-js/faker`)
│   └── Need factory orchestration with referential integrity?
│       └── Hand-rolled with Faker as the engine; no canonical factory library yet.
├── Ruby
│   ├── Need factory orchestration?  → references/factory-bot.md (FactoryBot + Faker as engine)
│   └── Just values?                  → faker-data (`faker-ruby` gem)
├── .NET (C# / F# / VB.NET)
│   └── references/bogus.md (only canonical option in the ecosystem)
└── JVM (Java / Kotlin / Scala)
    └── Multiple options (datafaker, easy-random, instancio); not covered here.
```

## Dispatch by job

| Job                                                                  | Tool                                                           |
|----------------------------------------------------------------------|----------------------------------------------------------------|
| Random field value (one name, one email)                              | Faker (any language) or mimesis (Python).                     |
| Typed-object factory with referential integrity                       | FactoryBot (Ruby) / Bogus (.NET) / hand-roll (Python+factory_boy, JS+fishery). |
| Locale-aware data (Japanese names, German addresses)                  | mimesis (Python; 46 locales) or Faker (any; 70+ locales).     |
| Bulk generation (10k+ rows for DB seeding)                            | mimesis Schema/Field (Python) or Bogus `GenerateLazy` (.NET). |
| Realistic but deterministic (seed-driven for repro)                   | All four - every library supports a seed; pin the version.    |
| Adversarial / security payloads                                       | None of these - use `malicious-payload-bank`. |
| Realistic-but-fake PII for non-prod                                   | `synthetic-pii-generator` (sibling skill that wraps Faker / mimesis). |

## Per-tool workflow overview

Each tool's full workflow (install, authoring, test-framework
integration, anti-patterns, limitations) lives in its reference
page; the shape at a glance:

### FactoryBot (Ruby) - [references/factory-bot.md](references/factory-bot.md)

The canonical Ruby fixture-factory library
([factory_bot-readme](https://github.com/thoughtbot/factory_bot)).
Define one base factory per model, add `trait` blocks for variants,
wire Faker into attribute blocks for values, and pick the weakest
build strategy that still tests what you need (`build_stubbed` >>
`build` >> `create`):

```ruby
FactoryBot.define do
  factory :user do
    name  { Faker::Name.name }
    trait :admin do role { "admin" } end
  end
end
user = create(:user, :admin)
```

### Mimesis (Python) - [references/mimesis.md](references/mimesis.md)

Fast, type-hinted, 46-locale Python generator
([mimesis-readme](https://github.com/lk-geimfari/mimesis)). Use
`Generic` for multi-provider fixtures and the `Schema` / `Field`
pattern for typed-dict bulk generation (10k+ rows):

```python
from mimesis import Generic, Locale
g = Generic(Locale.EN, seed=42)
user = {"name": g.person.full_name(), "email": g.person.email()}
```

### Bogus (.NET) - [references/bogus.md](references/bogus.md)

The canonical .NET generator
([bogus-readme](https://github.com/bchavez/Bogus)): typed
`Faker<T>` builders with fluent `.RuleFor` per property. Always use
`.StrictMode(true)` (fails when a property lacks a rule) and
`UseSeed` for reproducibility; `GenerateLazy` streams large batches:

```csharp
var faker = new Faker<User>().StrictMode(true).UseSeed(42)
    .RuleFor(u => u.Name,  f => f.Name.FullName())
    .RuleFor(u => u.Email, f => f.Internet.Email());
var user = faker.Generate();
```

## Side-by-side: same fixture in four languages

Generate a single user with name + email + a date of birth in
[1980, 2000]. Canonical example (Python / Faker):

```python
from faker import Faker

Faker.seed(42)
fake = Faker()

user = {
    "name":  fake.name(),
    "email": fake.email(),
    "dob":   fake.date_of_birth(minimum_age=23, maximum_age=43),
}
```

The pattern is identical across libraries; only the API style differs
(method calls vs. `RuleFor` builders). The same fixture in mimesis,
faker-js, FactoryBot, and Bogus:
[references/language-variants.md](references/language-variants.md).

## Cross-cutting concerns

### Seeding

Every library supports a seed. The convention is:

- **In CI:** seed with a known constant (e.g. `42`) so failures
  reproduce locally.
- **In demo / preview environments:** seed with the current date to
  vary data while staying reproducible per day.
- **Never** in production (you shouldn't be generating synthetic
  data in prod anyway).

### Version pinning

All four libraries change their PRNG sequence across major versions.
Pin the dependency version in CI; document the version in a
seeding-conventions doc; revisit on intentional library bumps.

### Per-test resetting

Reset the seed in per-test setup (`beforeEach` / autouse fixture) so
each test starts with the same baseline:

| Language | Reset call |
|---|---|
| JS / TS (Jest / Vitest) | `faker.seed(42)` in `beforeEach` |
| Python (pytest) | `Faker.seed(42)` in an autouse fixture |
| Ruby (RSpec) | `Faker::Config.random = Random.new(42)` in `before(:each)` |
| .NET (xUnit) | `new Faker<T>().UseSeed(42)` per test |

Full reset snippets per language:
[references/language-variants.md](references/language-variants.md).

## When NOT to use synthetic data

| Scenario                                        | Use this instead                                                |
|-------------------------------------------------|-----------------------------------------------------------------|
| Security testing (SQL injection / XSS)          | `malicious-payload-bank`. |
| Production-shaped PII (real-looking SSN, credit card) | `synthetic-pii-generator`. |
| Boundary cases (off-by-one, type-min/max)       | `boundary-value-generator`. |
| Negative-path coverage (error responses, malformed input) | `negative-test-generator`. |
| Persistent E2E seed sets                        | `seed-data-curator`. |

Faker / FactoryBot / mimesis / Bogus generate **realistic-looking
positive-path** data. The related skills above handle the
adversarial, boundary, and persistent cases.

## References

- [references/factory-bot.md](references/factory-bot.md) - Ruby FactoryBot full workflow (traits, associations, sequences, build strategies, anti-patterns).
- [references/mimesis.md](references/mimesis.md) - Python mimesis full workflow (providers, Generic, Schema/Field, locales, factory_boy pairing).
- [references/bogus.md](references/bogus.md) - .NET Bogus full workflow (`Faker<T>`, `RuleFor`, `StrictMode`, generation modes, seeding).
- [references/language-variants.md](references/language-variants.md) - the four-language fixture equivalents and per-test reset snippets.

## Related skills

- `faker-data` - the family default for
  plain field values (Python / JS / Ruby).
- `malicious-payload-bank`,
  `synthetic-pii-generator`,
  `boundary-value-generator`,
  `negative-test-generator`,
  `seed-data-curator` - sibling
  skills for the cases this umbrella does NOT cover.
