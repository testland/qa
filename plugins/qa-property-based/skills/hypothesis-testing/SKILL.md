---
name: hypothesis-testing
description: "Authors property-based tests in Python using Hypothesis - wires `@given` with `strategies` (`st.integers`, `st.text`, `st.lists`, `st.from_regex`, `st.composite`), uses `assume()` / `.filter()` for preconditions, configures via `@settings(max_examples=..., deadline=...)`, and exploits Hypothesis's automatic shrinking to find the falsifying example. Integrates with pytest fixtures + parametrize. Use when a Python project needs PBT to catch edge cases the example-based tests miss - bug clusters around input ranges / boundary values / interaction between fields."
---

# hypothesis-testing

## Overview

Hypothesis is the canonical Python property-based testing library
([hyp-quickstart][hq]). It generates inputs from `strategies` and
automatically shrinks any failure to the simplest reproducer.

[hq]: https://hypothesis.readthedocs.io/en/latest/quickstart.html

## When to use

- A Python function has a non-trivial input domain (numeric ranges,
  string formats, list shapes) and example-based tests miss edge
  cases.
- A bug fix needs a property test to prevent regression of a class
  of inputs (not just the one that caused the bug).
- Refactoring code where the new implementation should be
  observably equivalent to the old (use Hypothesis to verify
  property: `new(x) == old(x) for all x`).
- Testing parsers / serializers / encoders where round-trip
  properties hold (`decode(encode(x)) == x`).

If only one or two specific examples need verification, parametrize
or fixtures suffice - Hypothesis is overkill.

## Step 1 - Install

```bash
pip install hypothesis
```

Pin a version in `requirements-dev.txt` / `pyproject.toml`.
Hypothesis is well-maintained but adds 1-2 seconds to test runtime
per generated case; default 100 examples per `@given`.

## Step 2 - Basic property test

Per [hyp-quickstart][hq]:

```python
from hypothesis import given, strategies as st

@given(st.integers(0, 100))
def test_example(n):
    assert n < 50
```

The decorator runs the test 100 times with random `n` in `[0, 100]`.
On failure, Hypothesis reports the **falsifying example** (the
smallest `n` that violates the assertion) - typically `50` here.

## Step 3 - Strategies

Per [hyp-quickstart][hq], a strategy names the shape of the input. The
common ones:

```python
st.integers(0, 100)                   # bounded ints
st.floats(allow_nan=False)            # floats, optionally excluding NaN/Inf
st.text(min_size=1)                   # strings
st.lists(st.integers(), max_size=10)  # collections
st.from_regex(r"[a-z]+@[a-z]+\.com", fullmatch=True)  # format-validated
st.sampled_from(Status)               # enum-like
```

Full catalog (`binary`, `dictionaries`, `tuples`, `builds`, `composite`):
[references/hypothesis-reference.md](references/hypothesis-reference.md).

## Step 4 - Composite strategies (dependent fields)

Per [hyp-quickstart][hq], `@st.composite` lets later values depend
on earlier ones via `draw()`:

```python
from hypothesis import strategies as st

@st.composite
def valid_dates(draw):
    year = draw(st.integers(1900, 2100))
    month = draw(st.integers(1, 12))
    if month in (1, 3, 5, 7, 8, 10, 12):
        day = draw(st.integers(1, 31))
    elif month in (4, 6, 9, 11):
        day = draw(st.integers(1, 30))
    else:
        # Feb: account for leap years
        max_day = 29 if (year % 4 == 0 and year % 100 != 0) or year % 400 == 0 else 28
        day = draw(st.integers(1, max_day))
    return date(year, month, day)

@given(valid_dates())
def test_date_round_trip(d):
    assert date.fromisoformat(d.isoformat()) == d
```

The `draw()` call requests a value from a strategy; the composite
returns the constructed value.

## Step 5 - Filtering and assumptions

Two ways to constrain inputs:

```python
# Filter at strategy level (preferred - Hypothesis can sample efficiently)
@given(st.integers(0, 100).filter(lambda x: x % 2 == 0))
def test_even_squares(n):
    assert (n * n) % 2 == 0

# Filter at test level (fallback when filtering depends on multi-input)
from hypothesis import assume

@given(st.integers(), st.integers())
def test_division(a, b):
    assume(b != 0)   # discard cases where b == 0
    result = a // b
    assert result * b + (a - result * b) == a
```

Per [hyp-quickstart][hq], use `.filter()` at the strategy level
when possible (Hypothesis can sample efficiently). Use `assume()`
inside the test when the precondition involves multiple inputs.

**Heavy filtering is a smell** - if 90% of generated cases are
discarded, redesign the strategy.

## Step 6 - Settings and reproducibility

```python
from hypothesis import given, settings, strategies as st

@settings(max_examples=500, deadline=2000)   # 500 cases, 2s deadline per case
@given(st.integers())
def test_expensive(n):
    expensive_function(n)
```

For CI, set `derandomize=True` to make failures reproducible across
runs (vs random seed = same property test passes locally, fails on
CI mysteriously). Full settings table (`max_examples`, `deadline`,
`phases`, `verbosity`):
[references/hypothesis-reference.md](references/hypothesis-reference.md).

## Step 7 - Round-trip and metamorphic properties

Two of the most useful property patterns:

### Round-trip

```python
import json

@given(st.dictionaries(st.text(), st.integers()))
def test_json_round_trip(d):
    assert json.loads(json.dumps(d)) == d
```

If `decode(encode(x)) == x` for all valid `x`, the encode/decode
pair is correct.

### Metamorphic (relating two computations on related inputs)

```python
@given(st.lists(st.integers()))
def test_sort_idempotent(xs):
    assert sorted(sorted(xs)) == sorted(xs)

@given(st.lists(st.integers()), st.integers())
def test_sort_commutes_with_offset(xs, offset):
    sorted_xs = sorted(xs)
    sorted_offset = sorted(x + offset for x in xs)
    assert all(s + offset == o for s, o in zip(sorted_xs, sorted_offset))
```

Metamorphic tests are powerful when the function's "correct
output" is hard to specify but its relationship to other inputs is
easy.

## Step 8 - pytest integration

Per [hyp-quickstart][hq]: "Hypothesis works seamlessly with pytest
fixtures and parametrize decorators."

```python
@pytest.fixture
def db_conn():
    # ... setup ...
    yield conn
    # ... teardown ...

@given(st.integers(0, 1000))
def test_with_fixture(db_conn, n):
    db_conn.insert(id=n)
    assert db_conn.find(id=n) == n
```

Hypothesis re-runs the test body with new `n` each time; the
fixture is set up once per test (per pytest's normal scope rules,
unless it's `function`-scoped - then once per generated case).

## Step 9 - CI integration

```yaml
- run: pytest --hypothesis-seed=42  # deterministic seed for reproducibility

# OR via @settings(derandomize=True)
```

When a property test fails, the failure includes the falsifying
example - copy that into a regression test:

```python
@given(...)
@example(n=42)   # the falsifying example from the prior run
def test_my_property(n):
    ...
```

`@example` cases run before generated ones; locks the regression in
permanently.

## References

- [references/hypothesis-reference.md](references/hypothesis-reference.md) - full
  strategies catalog, `@settings` table, anti-patterns, limitations.
- [hyp-quickstart][hq] - Hypothesis quickstart: `@given`,
  strategies, shrinking, composite, `assume()`, settings.
- `fast-check-testing`,
  `proptest-testing`,
  `jqwik-testing`,
  `quickcheck-testing` - 
  per-language siblings with similar shape.
- `schemathesis-fuzzing` - applies PBT to API schemas (different layer; same conceptual
  framework).
