---
name: nose2-tests
description: "Configures and runs nose2 - successor to nose (the original Python test discovery library, end-of-life 2015) and an alternative to pytest's discovery model; supports plugin architecture, layers (per-test-class setUp/tearDown shared across modules), parameterized tests via `nose2.tools.params`, multi-process parallelism via mp plugin. Use when migrating from legacy nose1 codebases or when the team prefers nose2's plugin model over pytest."
---

# nose2-tests

## Overview

Per [docs.nose2.io][n2-docs]:

[n2-docs]: https://docs.nose2.io/

nose2 is the successor to `nose` (the original third-party Python
test discovery library; reached end-of-life in 2015 - do NOT use
nose1 in new projects). nose2 inherits nose's discovery model
plus a plugin architecture.

Modern recommendation: prefer `pytest-tests`
for new work. nose2 fits two cases:

- Maintaining a project already on nose1 (migration path is mostly
  configuration changes; tests transfer largely unchanged).
- Team specifically preferring nose2's plugin / layer model.

## When to use

- Existing nose1 codebase migrating away (nose1 is unmaintained).
- Specific need for nose2 features (layers, certain plugins).
- Maintenance scenario where pytest migration is too costly.

## Step 1 - Install

```bash
pip install nose2
```

## Step 2 - First test

nose2 supports both unittest-style TestCase classes + simple
function tests:

```python
# test_sum.py
import unittest

def sum(a, b):
    return a + b

class TestSum(unittest.TestCase):
    def test_adds(self):
        self.assertEqual(sum(1, 2), 3)

# Function-style also works
def test_sum_function():
    assert sum(2, 3) == 5
```

Run:

```bash
nose2                              # discover from cwd
nose2 -v                           # verbose
nose2 tests.test_sum               # specific module
nose2 tests.test_sum.TestSum       # specific class
```

## Step 3 - Configuration

`unittest.cfg` or `nose2.cfg`:

```ini
[unittest]
plugins = nose2.plugins.layers
          nose2.plugins.attrib
          nose2.plugins.junitxml
          nose2.plugins.coverage

start-dir = tests
test-file-pattern = test_*.py

[junit-xml]
always-on = True
path = build/junit.xml

[coverage]
always-on = True
coverage = src
coverage-report = term-missing
```

## Step 4 - Layers (nose2-distinctive)

Layers are setUp/tearDown shared across multiple test classes:

```python
class DatabaseLayer(object):
    @classmethod
    def setUp(cls):
        cls.db = create_test_db()

    @classmethod
    def tearDown(cls):
        cls.db.close()

class TestUsers(unittest.TestCase):
    layer = DatabaseLayer

    def test_create_user(self):
        user = create_user(self.layer.db)
        self.assertEqual(user.id, 1)

class TestOrders(unittest.TestCase):
    layer = DatabaseLayer   # shares the same DB connection

    def test_create_order(self):
        ...
```

Layers establish setup once; multiple test classes consume.
Pytest's session-scoped fixtures cover similar territory.

## Step 5 - Parameterized tests

```python
from nose2.tools import params

@params(
    (1, 2, 3),
    (0, 0, 0),
    (-1, 1, 0),
)
def test_sum_param(a, b, expected):
    assert sum(a, b) == expected
```

Each row runs as a separate test - failures don't stop subsequent
rows.

## Step 6 - Attribute-based filtering

```python
from nose2.tools import attr

class TestSlow(unittest.TestCase):
    @attr('slow', type='integration')
    def test_slow_thing(self):
        ...
```

Run only marked tests:

```bash
nose2 -A 'slow'
nose2 -A 'type=integration'
```

Equivalent to pytest markers (cleaner in pytest).

## Step 7 - Plugins

| Plugin | Use |
|---|---|
| `nose2.plugins.layers` | Layer support (Step 4) |
| `nose2.plugins.attrib` | Attribute-based filtering (Step 6) |
| `nose2.plugins.junitxml` | JUnit XML output for CI dashboards |
| `nose2.plugins.coverage` | Coverage integration |
| `nose2.plugins.mp` | Multi-process parallel execution |
| `nose2.plugins.printhooks` | Debug hook visualization |

Enable via `unittest.cfg` `plugins =` list (Step 3).

## Step 8 - Migration from nose1

nose1's API:

| nose1 | nose2 equivalent |
|---|---|
| `nosetests` command | `nose2` command |
| `nose.tools.eq_` / `ok_` / `raises` | `unittest` self.assertEqual / etc., or pytest-style assert |
| `from nose.tools import with_setup` | TestCase setUp/tearDown |
| `nose.SkipTest` | `unittest.SkipTest` |
| `@attr('slow')` | `@attr('slow')` (same in nose2 with attrib plugin) |

Most test bodies survive migration unchanged; mostly config + import path changes.

For more aggressive migration, consider migrating directly to
pytest - discovery is even simpler + ecosystem is much richer.

## Step 9 - CI integration

```yaml
- run: pip install nose2
- run: nose2 -v --plugin=nose2.plugins.junitxml --junit-xml=junit.xml
```

For coverage:

```bash
coverage run -m nose2
coverage report --fail-under=80
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Start new project with nose2 | Pytest is the mainstream; nose2 community smaller | Use `pytest-tests` |
| Use nose1 (`nose` package) | Unmaintained since 2015 | Migrate to nose2 (Step 8) or pytest |
| Layers for stateful resources | State leaks across test classes | Per-class setUp or pytest function-scope fixtures |
| Skip plugin enable in config | Features (layers, attrib, etc.) unavailable | Enable in unittest.cfg (Step 3) |
| Use `nosetests` command (nose1) | Wrong runner | Use `nose2` (Step 2) |

## Limitations

- Smaller community + plugin ecosystem than pytest.
- Less mature plugin development since 2018-ish.
- Layer model has subtle ordering quirks (cls vs self conflation).
- Documentation is thinner than pytest's.

## References

- [n2-docs][n2-docs] - nose2 documentation
- nose2.io - landing
- github.com/nose-devs/nose2 - repository
- (NB: `nose` package itself is unmaintained; do not use)
- `pytest-tests`,
  `unittest-tests`,
  `doctest-tests` - sister tools
- `test-code-conventions` - test code hygiene
