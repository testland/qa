---
name: boundary-value-generator
description: "Generates boundary-value test cases from typed input specifications — for each input field, produces the canonical 6-point set (one below, at, and above the lower bound; one below, at, and above the upper bound) plus equivalence-class representatives. Emits cases as parameterized test inputs (pytest @parametrize / Jest test.each / xUnit InlineData / etc.). Use when a function or endpoint has numeric / string-length / collection-size constraints and the team needs systematic edge-case coverage."
rating: 24
d6: 4
archetype: S3
---

# boundary-value-generator

## Overview

For each bounded input, emit the canonical six-point boundary set
(`min-1`, `min`, `min+1`, `max-1`, `max`, `max+1`) per ISTQB
[boundary value analysis](https://glossary.istqb.org/en_US/term/boundary-value-analysis),
plus equivalence-class representatives, as parameterized test
inputs ready to paste into the project's test runner.

## When to use

- A function / endpoint has documented numeric / length / count
  constraints (`age >= 18`, `name.length <= 100`, `items.count
  between 1 and 50`).
- A change introduces a new constraint and the team wants
  systematic boundary coverage in the same PR.
- An existing test suite has happy-path coverage but no boundary
  cases; the team is filling the gap.
- The
  [`acceptance-criteria-extractor`](../../../qa-shift-left/skills/acceptance-criteria-extractor/SKILL.md)
  produced AC with numeric thresholds; this skill turns each
  threshold into matching test cases.

## Step 1 — Capture the input specification

The skill consumes a structured input spec — for each field:

| Field         | Notes                                                             |
|---------------|-------------------------------------------------------------------|
| `name`        | Field name (e.g. `age`).                                          |
| `type`        | `int` / `float` / `string` / `collection` / `enum`.               |
| `min`         | Lower bound (numeric / length / count).                           |
| `max`         | Upper bound.                                                      |
| `enum_values` | For `enum` type, the valid set.                                  |
| `nullable`    | Whether `null` / missing is valid.                                |
| `regex`       | For `string` type, optional regex constraint.                    |

YAML example:

```yaml
fields:
  - name: age
    type: int
    min: 18
    max: 120
    nullable: false
  - name: username
    type: string
    min: 3        # length
    max: 30       # length
    regex: '^[a-zA-Z0-9_]+$'
    nullable: false
  - name: tier
    type: enum
    enum_values: [free, starter, pro, enterprise]
    nullable: false
  - name: items
    type: collection
    min: 1        # count
    max: 50       # count
    nullable: true
```

## Step 2 — Apply the generation rules per type

### Numeric (`int`, `float`)

Six boundary points: `min-1`, `min`, `min+1`, `max-1`, `max`,
`max+1`. For `float`, also include `min - epsilon` and
`max + epsilon` where epsilon is the platform's smallest
representable difference (often `1e-9` is sufficient for
business-logic tests).

For `age` with `min=18, max=120`:

```
17, 18, 19, 119, 120, 121
```

### String (length-bounded)

Same six boundary points but applied to **length**. Generate
strings of those lengths from a deterministic source (e.g.
repeated `'a'`, or a Faker call seeded with `42`).

For `username` with `min=3, max=30`:

```
""           # length 0 — well below
"a"          # length 1 — well below
"aa"         # length 2 — min-1
"aaa"        # length 3 — min
"aaaa"       # length 4 — min+1
... (string of length 29)    # max-1
... (string of length 30)    # max
... (string of length 31)    # max+1
```

If a regex is also specified, the cases must satisfy the regex
(e.g. `[a-zA-Z0-9_]+` rejects empty string and any
underscore-prefixed value depending on regex anchors). Generate
**both** regex-matching and regex-violating cases — the latter
verifies the rejection path.

### Collection (count-bounded)

Same six boundary points applied to count. For `items` with
`min=1, max=50`:

```
[]                                   # count 0 — below
[item_1]                              # count 1 — min
[item_1, item_2]                       # count 2 — min+1
[... 49 items]                        # count 49 — max-1
[... 50 items]                        # count 50 — max
[... 51 items]                        # count 51 — above
```

Item shape comes from the matching factory (Faker / mimesis /
FactoryBot — see [`synthetic-data-toolkit`](../synthetic-data-toolkit/SKILL.md)).

### Enum

Test each enum value plus one **invalid** value:

For `tier` with `enum_values: [free, starter, pro, enterprise]`:

```
"free", "starter", "pro", "enterprise", "INVALID_TIER"
```

The invalid case verifies the rejection path on a typo / removed
tier name.

### Nullable fields

If `nullable: true`, also test `null` / missing. If `nullable: false`,
also test that null IS rejected — the rejection-path case.

## Step 3 — Emit in the test-runner-native format

The skill emits cases in the project's test-runner-native format.

### pytest

```python
import pytest

@pytest.mark.parametrize("age,expected", [
    (17, "rejected"),
    (18, "accepted"),
    (19, "accepted"),
    (119, "accepted"),
    (120, "accepted"),
    (121, "rejected"),
])
def test_age_boundary(age, expected):
    result = create_user(age=age)
    assert result.status == expected
```

### Jest / Vitest

```javascript
test.each([
  [17, 'rejected'],
  [18, 'accepted'],
  [19, 'accepted'],
  [119, 'accepted'],
  [120, 'accepted'],
  [121, 'rejected'],
])('age %i is %s', (age, expected) => {
  expect(createUser({ age }).status).toBe(expected);
});
```

### xUnit (.NET)

```csharp
[Theory]
[InlineData(17, "rejected")]
[InlineData(18, "accepted")]
[InlineData(19, "accepted")]
[InlineData(119, "accepted")]
[InlineData(120, "accepted")]
[InlineData(121, "rejected")]
public void Age_Boundary(int age, string expected)
{
    var result = CreateUser(age: age);
    Assert.Equal(expected, result.Status);
}
```

### JUnit 5 (Java)

```java
@ParameterizedTest
@CsvSource({
    "17, rejected",
    "18, accepted",
    "19, accepted",
    "119, accepted",
    "120, accepted",
    "121, rejected"
})
void age_boundary(int age, String expected) {
    var result = createUser(age);
    assertThat(result.status()).isEqualTo(expected);
}
```

## When NOT to apply boundaries

Some inputs don't have meaningful boundaries:

| Input type                          | Why no boundaries                                      |
|-------------------------------------|--------------------------------------------------------|
| Free-form names, descriptions, blobs | Length is bounded by storage, not business meaning. Boundary cases produce noise tests. |
| UUIDs / opaque identifiers          | The "valid" set is not range-bounded; equivalence classes are valid format vs. invalid format. |
| Booleans                             | Two values; just test both.                            |
| Dates without business semantics     | A date in 1900 isn't a "boundary"; the boundaries are business-level (minimum age, max future date for scheduling). |

For those, use [`equivalence partitioning`][istqb-eq] — group
inputs into classes that should produce identical behavior, test
one representative per class.

[istqb-eq]: https://glossary.istqb.org/en_US/term/equivalence-partitioning

## Anti-patterns

| Anti-pattern                                                     | Why it fails                                                       | Fix |
|------------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Testing only `min` and `max` (skip `±1`)                          | Off-by-one bugs hide in `min-1` / `min+1` adjacency.              | Always six points. |
| `min`-only when `max` is "infinite"                                | `Integer.MAX_VALUE`-class overflows are still bugs.                 | Use the type's max as `max` (e.g. `2^31 - 1` for int32). |
| String boundary using random characters every run                | Non-deterministic; flaky when the runner picks a regex-violating value by chance. | Seed the generator; use a fixed alphabet. |
| One mega-test that asserts every boundary at once                | One failing boundary breaks the whole test; remediation hard.     | One test per boundary point — parametrized. |
| Skipping enum invalid-value test                                 | The "INVALID" rejection path is untested; a removed enum value silently breaks. | Always include one invalid enum case. |

## Limitations

- **Single-input boundaries.** This skill covers per-field
  boundaries; for multi-field interactions (e.g. `start_date <
  end_date`), use the broader
  [`parameterized-test-generator`](../parameterized-test-generator/SKILL.md)
  with pairwise-combinatorial logic.
- **Domain-specific boundaries.** A "valid US ZIP code" is
  5 digits — boundary analysis won't surface that 99999 is valid
  but 10000 is not (Manhattan vs. Atlantic Ocean). Pair with
  domain validation rules.
- **Float arithmetic.** Floating-point boundaries depend on
  representable precision; epsilon-based testing has its own
  pitfalls (see Hamming's classical critique).

## References

- [ISTQB boundary value analysis](https://glossary.istqb.org/en_US/term/boundary-value-analysis)
  — canonical definition.
- [ISTQB equivalence partitioning][istqb-eq] — the complementary
  technique.
- [`parameterized-test-generator`](../parameterized-test-generator/SKILL.md)
  — broader skill including pairwise combinatorial cases.
- [`negative-test-generator`](../negative-test-generator/SKILL.md)
  — sibling skill for rejection-path coverage.
- [`synthetic-data-toolkit`](../synthetic-data-toolkit/SKILL.md)
  — for value generation when the boundary string requires a
  realistic-looking string.
