---
name: synthetic-data-tool-selector
description: "Chooses between the four mainstream synthetic test-data generators - Faker (JavaScript), FactoryBot (Ruby), mimesis (Python), Bogus (.NET) - picks the right tool by language and use case (raw value generation vs. typed factory orchestration), shows side-by-side equivalents for the same fixture across all four, and emits the language-appropriate code. Use when starting test-data work on a project and the team wants the \"which tool should I use\" decision documented."
---

# synthetic-data-tool-selector

## Overview

Synthetic-data generation has the same conceptual job in every
language: produce realistic field values, optionally compose them
into typed object graphs. But the canonical library differs per
language. This dispatcher routes the team to the right one and
shows side-by-side equivalents so a reviewer recognizes the
patterns regardless of which language the codebase uses.

## When to use

- Starting test-data work on a new project; the team is choosing a
  library.
- A polyglot codebase needs equivalent fixture patterns across
  multiple languages.
- An RFC or onboarding doc needs "here's how we do test data, in
  one page."

If the project is already standardized on one library, defer this
skill - go directly to the matching per-tool skill:

- `faker-data` - Python / JS / Ruby
  Faker.
- `factory-bot-data` - Ruby
  FactoryBot.
- `mimesis-data` - Python mimesis
  (alternative to Faker).
- `bogus-data` - .NET Bogus.

## Dispatch by language

```
Project language?
├── Python
│   ├── Need typed-dict / schema-based bulk generation?
│   │   └── Yes → mimesis-data (faster + typed schema-Field pattern)
│   └── No  → faker-data (Python `faker`, larger ecosystem)
├── JavaScript / TypeScript
│   ├── Browser or Node?  → faker-data (`@faker-js/faker`)
│   └── Need factory orchestration with referential integrity?
│       └── Hand-rolled with Faker as the engine; no canonical factory library yet.
├── Ruby
│   ├── Need factory orchestration?  → factory-bot-data (FactoryBot + Faker as engine)
│   └── Just values?                  → faker-data (`faker-ruby` gem)
├── .NET (C# / F# / VB.NET)
│   └── bogus-data (only canonical option in the ecosystem)
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
| Multi-step user-journey scripts                 | `e2e-test-narrative-builder`. |
| Persistent E2E seed sets                        | `seed-data-curator`. |

Faker / FactoryBot / mimesis / Bogus generate **realistic-looking
positive-path** data. The related skills above handle the
adversarial, boundary, narrative, and persistent cases.

## References

- [references/language-variants.md](references/language-variants.md) - the four-language fixture equivalents and per-test reset snippets.

## Related skills

- `faker-data`
- `factory-bot-data`
- `mimesis-data`
- `bogus-data`
- `malicious-payload-bank`,
  `synthetic-pii-generator`,
  `boundary-value-generator`,
  `negative-test-generator`,
  `seed-data-curator` - sibling
  skills for the cases this dispatcher does NOT cover.
