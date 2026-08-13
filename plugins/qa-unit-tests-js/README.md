# qa-unit-tests-js

JS/TS unit testing in one umbrella skill: Jest and Vitest as co-primary
frameworks, with Mocha maintenance, Jasmine/Karma-to-Jest migration, and
deep coverage analysis as bundled references.

Per-framework lifecycle scope (configure / run / mock / coverage /
CI). Does **not** duplicate `qa-test-review` (test code hygiene); for
AAA structure, assertion quality, and mocking anti-patterns, see
that plugin instead.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [js-unit-tests](skills/js-unit-tests/SKILL.md) | Jest + Vitest install / config / mocking / coverage / watch / CI, framework choice (Vite → Vitest, else Jest; match existing convention), and test-authoring conventions; references cover Mocha, Jasmine-to-Jest migration via jest-codemods, and Jest/Vitest coverage deep-dive |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-js@testland-qa
```
