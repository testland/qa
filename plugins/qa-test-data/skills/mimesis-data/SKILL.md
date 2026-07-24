---
name: mimesis-data
description: "Authors Python test fixtures using mimesis - a fast, type-hinted, locale-aware test-data generator with 46 locales - covering Person / Address / Internet / Datetime providers and the Schema/Field pattern for typed-dict generation. Pairs with factory_boy when referential integrity is needed. Use when the project is Python and the team values speed, type hints, or strong locale coverage over Faker's larger ecosystem."
---

# mimesis-data

## Overview

Mimesis is a Python test-data generator that's "widely recognized as
the fastest data generator among Python solutions" with full type
hints for editor autocompletion ([mimesis-readme][readme]).

[readme]: https://github.com/lk-geimfari/mimesis

The library supports **46 locales** ([mimesis-readme][readme]) and
exposes both per-provider methods (`Person.full_name()`) and a
schema-based generator for typed-dict shapes.

## When to use

- The project is Python and the team values mimesis's speed (~10-100x
  faster than Faker on bulk generation, per the upstream benchmarks).
- Type hints matter - mimesis exposes typed return values that show
  up in IDE autocomplete.
- The project needs strong locale coverage - mimesis ships 46
  locales; Faker ships 70+ but many are Faker-thin (only a few
  providers populated).
- Schema-based generation is a fit - mimesis's `Schema` / `Field`
  pattern produces typed dicts directly.

If the team is already standardized on Faker, switching is rarely
worth it - see `faker-data`. If the team
needs factory orchestration with referential integrity, pair mimesis
with factory_boy (or use `factory-bot-data`
in Ruby projects).

## Install

```bash
pip install mimesis
```

(Per [mimesis-readme][readme].)

## Authoring

### Per-provider usage

```python
from mimesis import Person, Address, Internet, Datetime
from mimesis.locales import Locale

person = Person(Locale.EN)
person.full_name()                 # 'Brande Sears'
person.email(domains=['example.com'])   # 'roccelline1878@example.com'
person.gender()
person.title()

address = Address(Locale.EN)
address.full_address()             # '123 Main St, Springfield, IL 62701'
address.city()
address.country()

internet = Internet()
internet.url()
internet.ip_v4()
internet.user_agent()

dt = Datetime()
dt.datetime()
dt.date()
dt.formatted_datetime()
```

(Adapted from [mimesis-readme][readme].)

### Generic - one entry point per locale

```python
from mimesis import Generic
from mimesis.locales import Locale

g = Generic(Locale.EN)
g.person.full_name()
g.address.city()
g.internet.email()
```

`Generic` aggregates every provider under one instance - preferred
when a fixture needs values from multiple providers; avoids
constructing one provider per type.

### Schema-based - typed-dict generation

```python
from mimesis import Field, Schema, Locale

field = Field(Locale.EN)

# Build one row's worth of data
def schema():
    return {
        "id": field("uuid"),
        "name": field("person.full_name"),
        "email": field("person.email"),
        "created_at": field("datetime.datetime"),
        "address": {
            "city": field("address.city"),
            "zip": field("address.postal_code"),
        },
    }

# Generate a list of rows
generator = Schema(schema=schema, iterations=1000)
data = generator.create()    # → list of 1000 dicts
```

(Adapted from [mimesis-readme][readme] schema documentation.)

The schema/field pattern is mimesis's distinguishing feature - it
produces typed-dict shapes without per-field method calls, which
makes it convenient for bulk fixture generation (e.g. seeding a
test DB with 10k rows).

## Locale support

```python
from mimesis import Person
from mimesis.locales import Locale

Person(Locale.EN).full_name()    # 'Brande Sears'
Person(Locale.JA).full_name()    # '広橋 美月'
Person(Locale.RU).full_name()    # 'Анастасия Иванова'
Person(Locale.DE).full_name()    # 'Klaus Müller'
```

Per [mimesis-readme][readme], 46 locales are supported. Full list
at [mimesis.name/latest/locales.html](https://mimesis.name/latest/locales.html).

## Seeding for determinism

```python
from mimesis import Generic
from mimesis.locales import Locale

g = Generic(Locale.EN, seed=12345)
g.person.full_name()    # deterministic based on seed
```

Pass `seed=` at provider construction; subsequent calls are
deterministic. Same as `faker-data`, seed
in tests so failures reproduce locally.

## Pairing with factory_boy

Mimesis can be the value engine for factory_boy:

```python
from factory import Factory, LazyFunction
from mimesis import Person, Locale
from myapp.models import User

person = Person(Locale.EN, seed=42)

class UserFactory(Factory):
    class Meta:
        model = User

    name  = LazyFunction(person.full_name)
    email = LazyFunction(lambda: person.email())
```

`LazyFunction` ensures each factory instantiation re-calls the
mimesis method - getting a new value per fixture, not a single
shared one.

## Anti-patterns

| Anti-pattern                                                  | Why it fails                                                       | Fix |
|---------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Constructing one provider per attribute                        | `Person()` per field is N times the constructor cost; slows bulk generation. | Use `Generic` once; access providers as attributes. |
| Hardcoding `seed=` literally to a value the test depends on    | Brittle: a mimesis update changes the PRNG sequence; the test fails next upgrade. | Pin mimesis version; OR assert *patterns* (matches a regex), not literal values. |
| Using mimesis for **security** payloads                         | Mimesis generates realistic-looking data; SQL injection / XSS won't appear. | Use `malicious-payload-bank`. |
| Schema with 100k iterations in pytest                          | Memory-bound; slow.                                                  | Generate to disk (`Schema.to_csv`, `Schema.to_json`) and seed the DB outside the test. |
| Mixing mimesis + Faker in the same project                     | Two PRNGs to seed; two doc surfaces; two upgrade cadences.           | Pick one; if migrating, do it in a single PR. |

## Limitations

- **Smaller community than Faker.** Fewer Stack Overflow answers,
  fewer third-party providers.
- **PRNG sequence varies across major versions.** Pin the version in
  CI for deterministic tests across runs.
- **No native factory orchestration.** You still need factory_boy
  (or hand-rolled equivalents) for referential integrity.

## References

- [mimesis-readme][readme] - install, providers, Generic, Schema/Field,
  46 locales.
- mimesis docs - https://mimesis.name/
- `faker-data` - Python Faker alternative.
- `synthetic-data-tool-selector` - 
  dispatcher selecting between mimesis / Faker / FactoryBot / Bogus.
