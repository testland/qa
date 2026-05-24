# qa-unit-tests-js

JS/TS unit testing per-framework wrappers + orchestrator agent. Five S1
framework skills + 1 A2 agent.

Per-framework lifecycle scope (configure / run / mock / coverage /
CI). Does **not** duplicate `qa-test-review` (test code hygiene); for
AAA structure, assertion quality, and mocking anti-patterns, see
that plugin instead.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [jest-tests](skills/jest-tests/SKILL.md) | S1 | Meta-built batteries-included; built-in `expect` + snapshot + mocking + coverage; `--ci` flag for safe CI runs |
| Skill | [vitest-tests](skills/vitest-tests/SKILL.md) | S1 | Vite-native; Jest-compatible API; in-source testing; browser-mode; `--typecheck` flag for type validation |
| Skill | [mocha-tests](skills/mocha-tests/SKILL.md) | S1 | Pluggable runner pairable with Chai/Sinon/nyc/c8; BDD + TDD interfaces; `--parallel` since Mocha 8 |
| Skill | [ava-tests](skills/ava-tests/SKILL.md) | S1 | Concurrent-by-default per-file process isolation; explicit imports; powerful diff-rich failure output; `test.failing` for known-bug markers |
| Skill | [jasmine-tests](skills/jasmine-tests/SKILL.md) | S1 | Original BDD-style; legacy AngularJS heritage; built-in matchers + spies; pairs with Karma (legacy); migration-to-Jest path documented |
| Agent | [js-test-author](agents/js-test-author.md) | A2 | Authors one JS/TS unit test given a target module + behavior spec; detects framework + Faker + MSW from package.json; emits idiomatic Jest/Vitest/Mocha/Jasmine/AVA test file |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-js@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
