# qa-unit-tests-python

Python unit testing per-framework wrappers. Four skills covering
stdlib + community Python test frameworks: pytest (modern de facto),
unittest (stdlib JUnit-port), doctest (docstring-embedded tests),
nose2 (legacy alternative), plus one orchestrator that authors a
single test per spec by detecting the framework convention from the
project's config or existing tests.

Per-framework lifecycle scope. Does **not** duplicate
`qa-test-review` (test code hygiene).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [pytest-tests](skills/pytest-tests/SKILL.md) | Modern de facto; fixture DI, parametrize, markers, plugin ecosystem |
| Skill | [unittest-tests](skills/unittest-tests/SKILL.md) | Stdlib JUnit-port; TestCase + setUp/tearDown; unittest.mock bundled |
| Skill | [doctest-tests](skills/doctest-tests/SKILL.md) | Docstring-embedded executable examples; Sphinx integration |
| Agent | [python-test-author](agents/python-test-author.md) | Authors one Python unit test per spec; detects pytest / unittest / doctest / nose2 from pyproject.toml / setup.cfg / tox.ini / existing test files; pairs with mimesis when present |
| Skill | [pytest-asyncio-patterns](skills/pytest-asyncio-patterns/SKILL.md) | Async testing with pytest-asyncio: markers, loop scope, AsyncMock, FastAPI/aiohttp clients. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-python@testland-qa
```
