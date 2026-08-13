# qa-data-notebooks

Jupyter notebook testing in one skill. **papermill** as the executor
(parameterize + run), **nbval** for full-notebook output regression,
**testbook** for function-level unit tests, **nbstripout** as the
committed-output gate - wired into a single GitHub Actions CI pipeline,
with a PR review checklist for notebook changes (untested notebooks,
`--nbval-lax` misuse, credentials, non-deterministic outputs, missing
`parameters` tags, committed outputs).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [notebook-ci-pipeline-author](skills/notebook-ci-pipeline-author/SKILL.md) | Stand up the full notebook CI pipeline: papermill execute, nbval regression, testbook unit tests, nbstripout gate, artifacts - plus the notebook PR review checklist with BLOCK/PASS verdicts. Per-tool depth for papermill and nbval in references/. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-data-notebooks@testland-qa
```
