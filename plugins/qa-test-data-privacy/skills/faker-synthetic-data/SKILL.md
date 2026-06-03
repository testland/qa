---
name: faker-synthetic-data
description: "Author and run Faker libraries (Python `Faker`, JavaScript `@faker-js/faker`, Java `JavaFaker`, .NET `Bogus`) for generating synthetic substitute data when masking pipelines remove real PII. Covers locale-aware generators, deterministic seeding for test reproducibility, the common provider methods (name / email / address / phone / SSN / credit card / IBAN / date / UUID / text), pytest fixture integration, and the trade-off between random vs deterministic substitution for referential integrity. Use after a PII detector flags fields that need synthetic replacement (distinct from synthetic-pii-generator which assembles fixtures from scratch - this is the underlying library skill those build skills compose)."
rating: 23
d6: 4
---

# faker-synthetic-data

## Overview

Faker is the building block beneath both fresh-fixture generation
([`synthetic-pii-generator`](../../../qa-test-data/skills/synthetic-pii-generator/SKILL.md))
and PII masking pipelines
([`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md))
that need to replace detected PII with a plausible substitute.

Same library family across languages:

- **Python** - `Faker` ([faker.readthedocs.io](https://faker.readthedocs.io/en/master/))
- **JavaScript / TypeScript** - `@faker-js/faker` ([fakerjs.dev](https://fakerjs.dev/guide/))
- **Java** - JavaFaker (`com.github.javafaker:javafaker`)
- **.NET** - Bogus (`Bogus` NuGet package)
- **Ruby** - `faker` gem
- **PHP** - `fakerphp/faker`

Methodology and provider names are similar across languages; this
skill covers Python + JavaScript primarily (most widely used).

## When to use

- After
  [`presidio-pii-detection`](../presidio-pii-detection/SKILL.md)
  flags PII spans in real data, replace them with Faker output via
  Presidio's `custom` operator wrapping a Faker call.
- Seed staging databases with realistic synthetic profiles.
- Generate property-based test inputs that need realistic shape
  (use in conjunction with
  [`hypothesis-testing`](../../../qa-property-based/skills/hypothesis-testing/SKILL.md)
  or `fast-check`).

For complete *fresh-fixture* generation with PCI-DSS / Luhn /
region-format constraints baked in, use
[`synthetic-pii-generator`](../../../qa-test-data/skills/synthetic-pii-generator/SKILL.md) - it's the higher-level skill that composes Faker calls into
fixture-bundle workflows.

## Authoring

### Python - Faker

Per [faker.readthedocs.io](https://faker.readthedocs.io/en/master/):

```bash
pip install Faker
```

```python
from faker import Faker

fake = Faker()  # defaults to en_US
print(fake.name())            # "Allison Hill"
print(fake.email())           # "ndavis@example.org"
print(fake.address())         # "778 Brown Plaza\nSouth Christine, MA..."
print(fake.phone_number())    # "001-543-810-3357x96334"
print(fake.ssn())             # "498-52-4970"
print(fake.credit_card_number(card_type="visa"))  # Luhn-valid
print(fake.iban())            # "GB95...30CG"
print(fake.date_of_birth())   # datetime.date(1962, 1, 17)
print(fake.uuid4())
print(fake.paragraph(nb_sentences=3))
```

### Locale-aware generation

A US fixture and a JP fixture need different name distributions,
phone formats, and address patterns:

```python
fake_us = Faker("en_US")
fake_jp = Faker("ja_JP")

print(fake_us.name())   # "John Smith"
print(fake_jp.name())   # "山田 太郎"
print(fake_jp.address())
# 北海道札幌市中央区...
```

For datasets with multi-locale users, sample per row:

```python
fake = Faker(["en_US", "ja_JP", "es_ES", "de_DE", "fr_FR"])
for _ in range(10):
    print(fake.name())  # mixed locales
```

### Deterministic seeding

For reproducible test fixtures (golden-file comparison, snapshot
testing):

```python
Faker.seed(4321)
fake = Faker()
print(fake.name())  # always the same with the same seed + Faker version
```

Per Faker docs: "A Seed produces the same result when the same
methods with the same version of faker are called." **Pin the
Faker version in `requirements.txt`** - across versions the seeded
output drifts.

### pytest plugin

Faker ships a pytest fixture:

```python
def test_user_creation(faker):
    user = User.create(name=faker.name(), email=faker.email())
    assert user.id is not None
```

The `faker` fixture is auto-seeded per test (configurable via
`faker_seed` marker).

### JavaScript / TypeScript - @faker-js/faker

Per [fakerjs.dev/guide](https://fakerjs.dev/guide/):

```bash
npm install -D @faker-js/faker
```

```typescript
import { faker } from "@faker-js/faker";

console.log(faker.person.firstName());
console.log(faker.person.lastName());
console.log(faker.internet.email());
console.log(faker.phone.number());
console.log(faker.location.streetAddress());
console.log(faker.location.city());
console.log(faker.location.country());
console.log(faker.finance.creditCardNumber());
console.log(faker.finance.iban());
console.log(faker.string.uuid());
console.log(faker.date.past());
```

Locale-specific import:

```typescript
import { faker as fakerJP } from "@faker-js/faker/locale/ja";
import { faker as fakerDE } from "@faker-js/faker/locale/de";
```

Deterministic seed:

```typescript
faker.seed(123);
console.log(faker.person.firstName()); // always the same
```

### Template syntax via helpers.fake

```typescript
const greeting = faker.helpers.fake(
  "Hello {{person.firstName}} {{person.lastName}}!"
);
```

Useful for templated content (notification fixtures, email bodies).

## Running

### As a Presidio anonymiser operator

The classic masking-pipeline integration: detect PII with Presidio,
replace with Faker. Wrap Faker in a Presidio `custom` operator:

```python
from faker import Faker
from presidio_anonymizer.entities import OperatorConfig

fake = Faker()
Faker.seed(2026)

def fake_person(text, params=None):
    return fake.name()

def fake_email(text, params=None):
    return fake.email()

operators = {
    "PERSON": OperatorConfig("custom", {"lambda": fake_person}),
    "EMAIL_ADDRESS": OperatorConfig("custom", {"lambda": fake_email}),
    "PHONE_NUMBER": OperatorConfig("custom",
        {"lambda": lambda text, params=None: fake.phone_number()}),
}
```

This produces locale-coherent replacements (a flagged Spanish email
gets a Spanish-style replacement if Faker is locale-configured).

### Deterministic substitution for referential integrity

If the same email appears across multiple tables, random
substitution breaks joins. Use a deterministic seed per original
value:

```python
def fake_email_deterministic(text, params=None):
    Faker.seed(hash(text) & 0xFFFFFFFF)
    return Faker().email()
```

Now `alice@acme.com` → `random-but-fixed@example.org` consistently
across every appearance.

For the broader pseudonymisation discussion see
[`data-masking-techniques-reference`](../data-masking-techniques-reference/SKILL.md)
on deterministic substitution.

## Parsing results

Faker output is plain strings (or library-specific types like
`datetime.date`, `decimal.Decimal`). Validate per downstream
contract:

```python
import re

email = fake.email()
assert re.fullmatch(r"[^@]+@[^@]+\.[^@]+", email)

card = fake.credit_card_number()
# Faker generates Luhn-valid numbers; verify if downstream requires
def luhn(n):
    digits = [int(d) for d in n if d.isdigit()][::-1]
    total = sum(d if i%2==0 else sum(divmod(d*2, 10)) for i, d in enumerate(digits))
    return total % 10 == 0

assert luhn(card)
```

## CI integration

For projects that maintain fixture sets, regenerate on every CI run
with a pinned seed so fixtures stay deterministic across runs but
change when explicitly requested:

```yaml
- run: python -m faker --seed 42 -r 100 -- 'name,email,phone_number' > fixtures.csv
```

Faker's CLI (`python -m faker`) supports CSV / JSON / YAML output.

## Example - synthesising a user table

```python
import csv
from faker import Faker

Faker.seed(2026)
fake = Faker(["en_US", "es_ES", "ja_JP"])

with open("users.csv", "w") as f:
    writer = csv.writer(f)
    writer.writerow(["id", "name", "email", "phone", "country", "dob"])
    for i in range(1000):
        writer.writerow([
            i,
            fake.name(),
            fake.email(),
            fake.phone_number(),
            fake.country(),
            fake.date_of_birth(minimum_age=18, maximum_age=80),
        ])
```

1000 synthetic users, locale-mixed, deterministic given the seed.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Unseeded fakes in a test | Test passes today, fails tomorrow (different fake values) | `Faker.seed(N)` per test or use the pytest fixture |
| Random substitution where referential integrity matters | Joins break across masked tables | Deterministic seed per source value (see Running section) |
| Single locale on a multi-locale dataset | Spanish emails get US replacements; layout / format drift in fixtures | Pass list of locales to `Faker([...])` |
| Faker.credit_card without Luhn awareness | Faker IS Luhn-valid; over-validation is wasted work | Trust Faker for cards; validate other formats |
| Using Faker output as "real" test card | Faker cards are Luhn-valid but not Stripe / Adyen test cards | Use `synthetic-pii-generator` for PCI-DSS-safe test cards (Stripe / Visa reserved ranges) |
| Unpinned Faker version in CI | Output drifts on upgrade; snapshot diffs break unexpectedly | Pin `faker==X.Y.Z` in lockfile |
| Using `fake.text()` for malicious-input testing | Faker text is benign; doesn't cover XSS / SQLi payloads | Use [`malicious-payload-bank`](../../../qa-test-data/skills/malicious-payload-bank/SKILL.md) |

## Limitations

- **Output is statistically random, not behaviourally realistic.**
  Faker won't generate users whose addresses match their phone
  area codes; for that level of coherence use
  [`synthea-healthcare-data`](../synthea-healthcare-data/SKILL.md)
  (which simulates patient lifecycles) or a domain-specific
  generator.
- **No deep semantic constraints.** Faker generates a credit card
  and an unrelated billing address - joining them won't match a
  real cardholder validation.
- **Locale coverage varies.** Some locales (en_US, en_GB, ja_JP,
  es_ES, de_DE, fr_FR) are well-supported; others have partial
  providers.
- **No regime-completeness guarantee.** Faker can generate the
  format of an SSN / SIN / NHS number; it doesn't claim
  jurisdictional safety. For reserved-for-testing ranges (Visa
  test cards, IRS test SSNs) use
  [`synthetic-pii-generator`](../../../qa-test-data/skills/synthetic-pii-generator/SKILL.md).

## References

- Python Faker - 
  [faker.readthedocs.io](https://faker.readthedocs.io/en/master/).
- @faker-js/faker (JavaScript) - 
  [fakerjs.dev/guide](https://fakerjs.dev/guide/).
- JavaFaker - `com.github.javafaker:javafaker` on Maven Central.
- Bogus (.NET) - `Bogus` NuGet package.
- Sibling generator (higher-level, regime-aware):
  [`synthetic-pii-generator`](../../../qa-test-data/skills/synthetic-pii-generator/SKILL.md).
- Composes with:
  [`presidio-pii-detection`](../presidio-pii-detection/SKILL.md),
  [`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md).
