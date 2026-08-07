---
name: faker-synthetic-data
description: "Substitutes realistic replacement values for PII that a masking or de-identification step removed, nulled, or redacted, so a non-production dataset stays usable. Covers building an injective substitution map that keeps a shared identifier consistent everywhere it appears so joins survive; choosing deterministic (seeded) over random substitution, and the re-identification risk a shared or committed seed reintroduces, since a seed is a reproducibility control, not a key; preserving field shape where a downstream system validates it, including check-digit values such as payment-card and national-ID numbers plus phone and postal formats; and why a value that merely looks realistic is not yet safe, leaving a residual re-identification measurement over the remaining quasi-identifiers. Use when an existing dataset holds or has just lost real PII - a production dump sitting in staging, or a masking step that nulled the columns - and it needs believable stand-in values that keep cross-table joins intact."
---

# faker-synthetic-data

## The axis this skill owns

A de-identification step has already run: direct identifiers are nulled,
redacted, or replaced with a placeholder. The dataset is private but
broken, because joins fail and validators reject empty fields. This
skill covers putting usable values back and the privacy decisions that
forces: keeping a shared identifier consistent so joins survive,
deterministic versus random substitution, preserving a validated field
shape, and proving the result is safe rather than merely realistic.

It deliberately does **not** cover the generic mechanics of a fake-data
library: installation, the provider catalogue, per-locale tours, or
factory patterns for building fixtures from nothing. Nor does it cover
detecting PII or choosing between masking operators such as hashing,
tokenisation, and nulling. Both happen before this step.

## Minimum library surface

The worked example below uses only `Faker.seed(n)` (run reproducibility, a
class method) and `fake.unique.<method>()` (injective values, raising
`UniquenessException` once the value space is exhausted). The full mechanic
table - instance vs class seeding, JS `refDate`, multiple-locale weighting, and
Presidio's `custom` operator for driving substitution from an anonymiser - is
in [references/library-surface-and-seeding.md](references/library-surface-and-seeding.md).

## Step 1 - Build the substitution map before substituting anything

The masking literature requires masked values to stay consistent across
databases that share a data element, and to be repeatable (the same input
always yields the same output) yet not reversible to the original
([en.wikipedia.org/wiki/Data_masking](https://en.wikipedia.org/wiki/Data_masking)).

So do not substitute row by row while streaming. Collect the distinct
real values first, build one map, apply it everywhere. Two properties
must hold:

- **Injective.** Two real people must never collapse onto one
  substitute, or a join over-matches and row counts silently inflate.
  `fake.unique` enforces this until the provider's value space runs out
  ([faker.readthedocs.io](https://faker.readthedocs.io/en/master/)).
- **Complete.** Cover every place the identifier appears: denormalised
  copies, free-text mentions in comment fields, filenames, exports
  already in the bundle. A column missed here is a column where the
  real value survives.

The map is the sensitive artifact. Retaining it where the recipient can
reach it makes the output pseudonymised, not anonymised: GDPR Article 4(5)
treats data attributable to a subject only via separately-kept additional
information as pseudonymised
([gdpr-info.eu](https://gdpr-info.eu/art-4-gdpr/)), and Recital 26 counts data
re-attributable through such additional information as personal data
([gdpr-info.eu](https://gdpr-info.eu/recitals/no-26/)). Keeping the map is a
legitimate choice. Calling the result anonymous afterwards is not.

## Step 2 - What a seed guarantees, and what it does not

**Does.** Reproduce the same generator sequence on a later run, for the
same library version. Faker warns that "as we keep updating datasets,
results are not guaranteed to be consistent across patch versions"
([faker.readthedocs.io](https://faker.readthedocs.io/en/master/)); the
JavaScript port warns "you may get different values for the same seed"
after an upgrade
([fakerjs.dev](https://fakerjs.dev/guide/usage.html)).

**Does not.** Act as a key. Python Faker draws from a `random.Random`
([faker.readthedocs.io](https://faker.readthedocs.io/en/master/fakerclass.html)),
and the standard library warns that the module's generators are not for
security use and points to the `secrets` module for cryptographic uses
([docs.python.org](https://docs.python.org/3/library/random.html)). A seed
offers no resistance to anyone holding it.

The four seeding strategies (per-value derived seed, global seed plus a stored
map, global seed with the map discarded, unseeded random) are compared by
re-identification exposure in
[references/library-surface-and-seeding.md](references/library-surface-and-seeding.md).
The per-value derived seed is the pattern to avoid. It needs no stored
map, and it fails for the reason unsalted hashing of a low-entropy
field fails: the input space is enumerable, so the mapping is
rebuildable. If a stored map is unacceptable, the answer is a keyed
transform, not a derived seed.

## Step 3 - Preserve the shape the downstream system validates

**Check-digit values.** Payment card numbers, and national identifiers
including Canadian social insurance numbers, Israeli and South African
ID numbers, and Swedish personal identity numbers, carry a Luhn ("mod
10") check digit specified in ISO/IEC 7812-1
([en.wikipedia.org/wiki/Luhn_algorithm](https://en.wikipedia.org/wiki/Luhn_algorithm)).
Faker exposes `credit_card_number(card_type=...)` accepting `'amex'`,
`'visa'`, `'mastercard'`, `'discover'`, `'diners'`, `'jcb'`, and
`'maestro'` among others, but does not state whether the output carries
a valid check digit
([faker.readthedocs.io](https://faker.readthedocs.io/en/master/providers/faker.providers.credit_card.html)),
so assert it rather than assume it:

```python
def luhn_ok(number: str) -> bool:
    digits = [int(d) for d in number if d.isdigit()][::-1]
    return sum(d if i % 2 == 0 else sum(divmod(d * 2, 10))
               for i, d in enumerate(digits)) % 10 == 0

assert luhn_ok(fake.credit_card_number(card_type="visa"))
```

Luhn "was designed to protect against accidental errors, not malicious
attacks"
([en.wikipedia.org/wiki/Luhn_algorithm](https://en.wikipedia.org/wiki/Luhn_algorithm)),
so passing it proves the field parses, not that the value is safe.

**Locale-bound formats.** Phone numbers and postal codes are validated
against the row's country, so pin one locale per row from that country
column instead of relying on multiple-locale mode's weighted random
draw.

**Format plus reversibility.** If the receiving system needs the
original back later and the shape must survive, substitution is the
wrong operator: NIST SP 800-38G, "Recommendation for Block Cipher Modes
of Operation: Methods for Format-Preserving Encryption", specifies FF1
and FF3 for that case
([csrc.nist.gov](https://csrc.nist.gov/pubs/sp/800/38/g/upd1/final)).

## Step 4 - Realistic is not safe, so measure the result

**Residual quasi-identifiers.** Substitution removes only the direct
identifiers actually substituted. Birth date, postal code, sex, and
admission date usually stay because they carry the analytical value,
and in combination they still identify people. NIST SP 800-188,
"De-Identifying Government Datasets: Techniques and Governance"
(September 2023), treats transforming quasi-identifiers and running
re-identification studies as part of de-identification, not optional
extras
([csrc.nist.gov](https://csrc.nist.gov/pubs/sp/800/188/final)). The
exit criterion is therefore a measurement over the remaining
quasi-identifier columns (smallest equivalence-class size, count of
unique rows), against Recital 26's test of whether means are
"reasonably likely to be used", accounting for "the costs of and the
amount of time required for identification"
([gdpr-info.eu](https://gdpr-info.eu/recitals/no-26/)).

**Accidental collisions.** Generators draw from fixed data, described in
the JavaScript port's guide as "lists of names, words etc"
([fakerjs.dev](https://fakerjs.dev/guide/usage.html)), so a generated
value can coincide with a real person's, including one in the source
file. Diff substitutes against source values and fail on any
intersection.

## Worked example - two joined files

`customers.csv` holds `email`; `orders.csv` holds `billing_email` and
joins on it. A masking step already dropped `ssn` and `full_name`.

```python
import csv
from faker import Faker

fake = Faker("en_US")
Faker.seed(0)  # run reproducibility only: not a secret, not derived from the data

def load(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))

customers, orders = load("customers.csv"), load("orders.csv")
real = {c["email"] for c in customers} | {o["billing_email"] for o in orders}
email_map = {v: fake.unique.email() for v in sorted(real)}

assert len(set(email_map.values())) == len(email_map)   # injective
assert not (set(email_map.values()) & real)             # no collision with source

before = len({c["email"] for c in customers} & {o["billing_email"] for o in orders})
for c in customers:
    c["email"] = email_map[c["email"]]
for o in orders:
    o["billing_email"] = email_map[o["billing_email"]]
after = len({c["email"] for c in customers} & {o["billing_email"] for o in orders})

assert before == after, f"join key cardinality changed: {before} -> {after}"
print(f"substituted {len(email_map)} identifiers, join keys preserved: {after}")
```

Discard `email_map`, or store it under separate access control. Never
ship it beside the substituted files.

## Expected output shape

| File | Column | Before | After |
|---|---|---|---|
| customers.csv | email | `alice.tan@acme.example` | `xrogers@example.org` |
| orders.csv | billing_email | `alice.tan@acme.example` | `xrogers@example.org` |
| customers.csv | postcode | `SW1A 1AA` | `SW1A 1AA` (quasi-identifier, unchanged) |

```text
substituted 12480 identifiers, join keys preserved: 9317
collision check vs source values: 0
residual quasi-identifiers not substituted: postcode, birth_date, sex
```

The third line is a handoff to a re-identification measurement: an open
item, not a pass.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Seeding the generator from the real value before each call | The mapping is rebuildable by anyone with the code and a candidate value list | One global seed plus an access-controlled map, or a keyed transform |
| Substituting row by row while streaming, with no map | The same person gets a different substitute per occurrence and every join breaks | Collect distinct values, build the map once, then apply |
| Calling the extract anonymous while retaining the map | The map is the "additional information" of GDPR Article 4(5); the output is still personal data | Destroy the map, or label the output pseudonymised |
| Substituting a checksum-bearing field without asserting the check digit | Downstream validators reject rows, so the environment looks broken rather than masked | Assert Luhn or the field's own check rule before writing |
| Multiple-locale mode on a dataset with a country column | Locale is a weighted random draw per call, so a French row gets a Japanese postcode | Instantiate one locale per row from that row's country |
| Declaring done once the direct identifiers look fake | Birth date plus postcode plus sex still identify people | Measure equivalence-class sizes over the remaining quasi-identifiers before release |
| Never diffing substitutes against source values | Fixed name lists mean a substitute can be a real person in the same file | Fail the run on any intersection |

## Limitations

- **A seed is version-bound.** Results are "not guaranteed to be
  consistent across patch versions"
  ([faker.readthedocs.io](https://faker.readthedocs.io/en/master/)), so
  a rerun after an upgrade produces a different map and breaks joins
  against extracts already delivered. Pin the version beside the seed.
- **Substitution alone never reaches anonymity.** Quasi-identifier
  transformation and the re-identification study are separate work
  ([csrc.nist.gov](https://csrc.nist.gov/pubs/sp/800/188/final)).
- **Injectivity has a ceiling.** `fake.unique` raises
  `UniquenessException` once the value space is exhausted
  ([faker.readthedocs.io](https://faker.readthedocs.io/en/master/)), so
  high-cardinality columns need a composed value (prefix plus counter).
- **No semantic coherence between substituted fields.** A substituted
  address and phone number are drawn independently, so area code and
  region will not agree. Derive a dependent field from the substituted
  one instead.
