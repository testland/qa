# qa-unit-tests-python

Python unit testing in one umbrella skill: pytest as the primary
framework, with stdlib unittest and doctest as bundled references,
plus a standalone skill for async testing with pytest-asyncio.

Per-framework lifecycle scope. Does **not** duplicate
`qa-test-review` (test code hygiene).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [python-unit-tests](skills/python-unit-tests/SKILL.md) | pytest fixtures / parametrize / markers / config / mocking / coverage / CI, framework choice, and test-authoring conventions; references cover stdlib unittest (+unittest.mock) and doctest |
| Skill | [pytest-asyncio-patterns](skills/pytest-asyncio-patterns/SKILL.md) | Async testing with pytest-asyncio: markers, loop scope, AsyncMock, FastAPI/aiohttp clients. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-python@testland-qa
```
