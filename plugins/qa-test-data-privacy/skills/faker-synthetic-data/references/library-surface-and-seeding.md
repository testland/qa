# faker-synthetic-data - library surface and seed-exposure detail

Deep reference for [faker-synthetic-data](../SKILL.md). The runnable core -
build the substitution map, assert injectivity, preserve check digits, measure
residual risk - stays in SKILL.md. This file holds the mechanic tables it draws
on.

## Minimum library surface

| Mechanic | Behaviour | Source |
|---|---|---|
| `Faker.seed(n)` | Class method; seeds the shared `random.Random` across all internal generators. Calling `.seed()` on an instance raises `TypeError` | [faker.readthedocs.io](https://faker.readthedocs.io/en/master/fakerclass.html) |
| `fake.seed_instance(n)` | Creates and seeds a unique `random.Random` for one instance | [faker.readthedocs.io](https://faker.readthedocs.io/en/master/fakerclass.html) |
| `fake.unique.<method>()` | Tracks values already returned; raises `UniquenessException` after repeated failures to find a new one | [faker.readthedocs.io](https://faker.readthedocs.io/en/master/) |
| Multiple-locale mode | The proxy "randomly select[s] a generator using a distribution defined by the provided weights", so locale varies per call | [faker.readthedocs.io](https://faker.readthedocs.io/en/master/fakerclass.html) |
| `faker.seed(123)` (JS) | Fixes the sequence; setting the seed again resets it. Date helpers also need `refDate` or `faker.setDefaultRefDate()` | [fakerjs.dev](https://fakerjs.dev/guide/usage.html) |

To drive substitution from an anonymiser, Microsoft Presidio exposes a `custom`
operator taking a "lambda to execute on the PII data. The lambda return type
must be a string", passed as `OperatorConfig("replace", {"new_value": "BIP"})`-style
entries in the `operators` dict
([presidio.dataprivacystack.org](https://presidio.dataprivacystack.org/anonymizer/)).

## Seed exposure matrix

The four seeding strategies referenced from Step 2 of the skill, ranked by the
re-identification exposure each one leaves:

| Mechanism | Joins survive | Re-identification exposure |
|---|---|---|
| Seed derived per value, reseeding from the real value before each call | Yes | **High.** Anyone with the code, the library version, and a candidate list of real values re-runs the derivation and rebuilds the map. The seed reproduces the substitute; it does not conceal the input |
| One global seed plus a stored map | Yes | Equal to the exposure of the map. Control access to the map, not the seed |
| One global seed, map discarded after the run | Yes, within the run | Low from the seed alone: the substitute follows call order, not the input value, so the seed reconstructs nothing without the source data |
| Unseeded, random per occurrence | **No** | Low, but the dataset is unusable for anything relational |
