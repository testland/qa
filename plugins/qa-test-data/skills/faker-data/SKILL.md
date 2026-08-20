---
name: faker-data
description: "Fixes test data that breaks tests - factory values in a shape the code under test rejects (a phone number that is not E.164), fixtures that only pass when the whole suite runs in order, and random values that make an assertion pass or fail depending on the run. Authors test-data factories with Faker: the Python `faker` library, the `@faker-js/faker` JS port, and the `faker-ruby` gem - install per language, the provider catalogue (person / internet / location / date / finance / lorem), locale selection and multi-locale mode, and seed-based determinism for reproducible runs. Scope is generating fresh values for tests that start from nothing, not replacing values inside a dataset that already holds real records - that goes to pii-masking-pipeline-builder. Use when fixtures need realistic values, a stable shape, or a fixed seed."
---

# faker-data

## Overview

Faker is a family of libraries (Python / JS / Ruby / Java / .NET / PHP)
that generate realistic synthetic field values - names, emails,
addresses, dates, etc. - for test fixtures. The three most common
ports in this skill's scope:

| Language | Library                                  | Reference        |
|----------|------------------------------------------|------------------|
| Python   | `faker`                                  | [faker-py][py]   |
| JS / TS  | `@faker-js/faker`                        | [faker-js][js]   |
| Ruby     | `faker-ruby/faker`                        | [faker-rb][rb]   |

[py]: https://faker.readthedocs.io/en/master/
[js]: https://github.com/faker-js/faker
[rb]: https://github.com/faker-ruby/faker

For .NET (Bogus) and Python-specifically with stronger locale
coverage (mimesis), see `synthetic-data-toolkit`.

## When to use

- A test fixture needs realistic but synthetic field values (the
  default `'foo'` / `'bar'` pattern produces tests that miss real
  bugs around long names, Unicode, edge-case formats).
- The team wants **reproducible** randomness - same seed produces
  same data, useful for regression repro.
- Locale coverage matters (i18n testing across `de_DE`, `ja_JP`,
  `ar_SA`, etc.).
- A factory library (FactoryBot, factory_boy, Bogus) needs the
  underlying generator - Faker is typically the random-data
  engine plugged into those.

## Install

### Python

```bash
pip install Faker
```

(Per [faker-py][py].)

### JavaScript / TypeScript

```bash
npm install --save-dev @faker-js/faker
```

(Per [faker-js][js].)

### Ruby

```ruby
# Gemfile
gem 'faker', group: :test
```

(Per [faker-rb][rb].)

## Authoring

### Python

```python
from faker import Faker

fake = Faker()
fake.name()              # 'Margaret Boehm'
fake.email()             # 'walker.travis@example.com'
fake.address()           # '123 Main St, Apt 4B\nSpringfield, IL 62701'
fake.phone_number()      # '+1-555-867-5309'
fake.date_of_birth(minimum_age=18, maximum_age=65)
fake.text(max_nb_chars=200)
```

(Per [faker-py][py].)

Common provider modules: `person` (name, prefix), `address`,
`internet` (email, url, ipv4), `phone_number`, `date_time`,
`lorem` (paragraphs, sentences, words), `company`, `credit_card`,
`job` ([faker-py][py]).

### JavaScript

```javascript
import { faker } from '@faker-js/faker';

faker.person.fullName();           // 'Margaret Boehm'
faker.internet.email();             // 'walker.travis@example.com'
faker.location.streetAddress();     // '123 Main St'
faker.phone.number();               // '+1-555-867-5309'
faker.date.past({ years: 30 });
faker.lorem.paragraphs(2);
```

(Per [faker-js][js].)

Module organization mirrors the Python ports but uses the **module-
namespace** form: `faker.person.*`, `faker.internet.*`,
`faker.location.*`, `faker.date.*`, `faker.finance.*`,
`faker.commerce.*` ([faker-js][js]).

### Ruby

```ruby
require 'faker'

Faker::Name.name           # 'Margaret Boehm'
Faker::Internet.email      # 'walker.travis@example.com'
Faker::Address.full_address
Faker::PhoneNumber.cell_phone
Faker::Date.birthday(min_age: 18, max_age: 65)
Faker::Lorem.paragraphs(number: 2)
```

(Per [faker-rb][rb].)

## Seeding for deterministic output

The most common test-stability mistake is letting Faker generate
non-deterministic values across runs. **Always seed** in tests so a
failure can be reproduced.

### Python

```python
from faker import Faker

# Class-level - sets the default RNG for all subsequent Faker() calls
Faker.seed(4321)
fake = Faker()

# Instance-level - useful when multiple Faker instances need different seeds
fake.seed_instance(4321)
```

(Per [faker-py][py].)

### JavaScript

```javascript
import { faker } from '@faker-js/faker';

faker.seed(123);
// All faker.* calls until the next seed() are deterministic.
```

(Per [faker-js][js].)

### Ruby

```ruby
require 'faker'

Faker::Config.random = Random.new(42)
```

For test frameworks: place the seed in `beforeEach` / `setup` so
each test starts with the same baseline; for paired runs, persist
the seed used per failing test (similar to the
`flake-pattern-reference` Pattern 8 randomness guidance).

## Locale support

### Python

```python
fake = Faker('it_IT')                # Italian
fake = Faker(['en_US', 'fr_FR', 'ja_JP'])   # Multi-locale (random per call)
fake.name()                          # generates per the configured locale(s)
```

(Per [faker-py][py].)

### JavaScript

```javascript
import { fakerDE } from '@faker-js/faker';
import { fakerJA } from '@faker-js/faker';

fakerDE.person.fullName();   // German name
fakerJA.address.city();       // Japanese city
```

(Per [faker-js][js]; 70+ locales available.)

### Ruby

```ruby
Faker::Config.locale = :ja
Faker::Name.name   # Japanese name
```

(Per [faker-rb][rb].)

## Composing factories with referential integrity

Faker generates field values; for **referential integrity** (a
factory that creates a `User` with a related `Order`), use a factory
library that wraps Faker:

| Language | Factory library | Skill                                              |
|----------|-----------------|----------------------------------------------------|
| Python   | `factory_boy`   | (consider mimesis - `synthetic-data-toolkit` - for locale-rich generation) |
| JS / TS  | `fishery` / `factory.ts` | hand-rolled with Faker as engine               |
| Ruby     | FactoryBot      | `synthetic-data-toolkit` references/factory-bot.md |
| .NET     | Bogus           | `synthetic-data-toolkit` references/bogus.md |

Faker alone won't enforce that `order.user_id == user.id`; the
factory library handles that.

## Anti-patterns

| Anti-pattern                                                   | Why it fails                                                       | Fix |
|----------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Calling Faker without a seed in tests                            | A failure on CI doesn't reproduce locally; flake-investigation guesswork. | Seed once per test or per suite (`Faker.seed(...)`). |
| Using `fake.email()` with a real domain (`example.com` is shared) | Spam concerns; some validators reject `example.com`.              | Faker's defaults use safe RFC-2606 domains; never override to a real domain in tests. |
| Hardcoding generated values into snapshots                      | Snapshot bound to a Faker version's PRNG sequence; library bump breaks the snapshot. | Snapshot the *shape* of the data; assert types and patterns rather than literal values. |
| Generating names with the wrong locale                          | A test asserting "name has at least one space" fails on `:ja` (Japanese) where names use `・`. | Match the locale to the assertion; or relax the assertion to be locale-aware. |
| Using Faker for **security testing** payloads                    | Faker generates "realistic" data, not malicious. SQL injection / XSS won't happen by chance. | Use `malicious-payload-bank` for adversarial input. |

## Limitations

- **PRNG sequence varies across major versions.** A seed produces
  different values in Faker `v18` vs `v19`. Pin the version in CI
  for deterministic tests.
- **Locale coverage is uneven.** `en_US` is the most complete; less-
  common locales fall back to defaults silently. Test the locales
  you care about; don't assume completeness.
- **Realistic ≠ valid.** Faker may generate an email with a
  technically-valid but unusual format (e.g. `+`-tagged); your
  validation may reject it. Match Faker's domain provider to your
  validator's regex.

## References

- [faker-py][py] - Python Faker docs (install, seed, locale,
  providers).
- [faker-js][js] - `@faker-js/faker` (modules, seed, 70+ locales).
- [faker-rb][rb] - `faker-ruby/faker` (modules, seed, locale).
- `synthetic-data-toolkit` - umbrella
  dispatcher for the generators beyond plain Faker: mimesis (Python),
  FactoryBot (Ruby), and Bogus (.NET) workflows in its references/.
