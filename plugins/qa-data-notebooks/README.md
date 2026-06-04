# qa-data-notebooks

Jupyter notebook testing - three complementary tools, one workflow.
Use **papermill** as the executor (parameterize + run), **nbval**
for full-notebook output regression, **testbook** for function-level
unit tests against notebook-defined functions.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [nbval-tests](skills/nbval-tests/SKILL.md) | `pytest --nbval` regression: re-run cells, compare to stored output; `--nbval-lax` for tutorials; per-cell controls (`#NBVAL_SKIP`, etc.); sanitize regex for dynamic outputs |
| Skill | [testbook-tests](skills/testbook-tests/SKILL.md) | `@testbook` decorator + `tb.ref()` / `tb.inject()` / `tb.patch()` for function-level unit tests; pytest fixture pattern for shared kernel |
| Skill | [papermill-tests](skills/papermill-tests/SKILL.md) | Parameterized execution (CLI + Python API); `parameters` cell tag; matrix sweeps; pairs with nbval/testbook |
| Agent | [notebook-quality-reviewer](agents/notebook-quality-reviewer.md) | Adversarial PR reviewer: flags untested cells, `--nbval-lax` misuse, hardcoded credentials, non-deterministic outputs, missing `parameters` tag, and committed outputs; emits BLOCK/PASS verdict |
| Skill | [notebook-ci-pipeline-author](skills/notebook-ci-pipeline-author/SKILL.md) | Stand up the full notebook CI pipeline: papermill execute, nbval regression, testbook unit, artifacts. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-data-notebooks@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
