# qa-data-notebooks

Jupyter notebook testing — three complementary tools, one workflow.
Use **papermill** as the executor (parameterize + run), **nbval**
for full-notebook output regression, **testbook** for function-level
unit tests against notebook-defined functions.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [nbval-tests](skills/nbval-tests/SKILL.md) | S1 | `pytest --nbval` regression: re-run cells, compare to stored output; `--nbval-lax` for tutorials; per-cell controls (`#NBVAL_SKIP`, etc.); sanitize regex for dynamic outputs |
| Skill | [testbook-tests](skills/testbook-tests/SKILL.md) | S1 | `@testbook` decorator + `tb.ref()` / `tb.inject()` / `tb.patch()` for function-level unit tests; pytest fixture pattern for shared kernel |
| Skill | [papermill-tests](skills/papermill-tests/SKILL.md) | S1 | Parameterized execution (CLI + Python API); `parameters` cell tag; matrix sweeps; pairs with nbval/testbook |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-data-notebooks@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
