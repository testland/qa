# qa-unit-tests-python

Python unit testing per-framework wrappers. Four S1 skills covering
stdlib + community Python test frameworks: pytest (modern de facto),
unittest (stdlib JUnit-port), doctest (docstring-embedded tests),
nose2 (legacy alternative).

Per-framework lifecycle scope. Does **not** duplicate
`qa-test-review` (test code hygiene).

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [pytest-tests](skills/pytest-tests/SKILL.md) | S1 | Modern de facto; fixture DI, parametrize, markers, plugin ecosystem |
| Skill | [unittest-tests](skills/unittest-tests/SKILL.md) | S1 | Stdlib JUnit-port; TestCase + setUp/tearDown; unittest.mock bundled |
| Skill | [doctest-tests](skills/doctest-tests/SKILL.md) | S1 | Docstring-embedded executable examples; Sphinx integration |
| Skill | [nose2-tests](skills/nose2-tests/SKILL.md) | S1 | Successor to nose1 (EOL); plugin/layer model; migration path |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-python@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
