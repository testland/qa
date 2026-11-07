# qa-tdd

Test-driven development for people and coding agents: red-green-refactor one test at a time, reproduce bugs with a failing test first, and prove a change works with test evidence before calling it done.

Language-neutral: it owns the order of work and the evidence. The framework
details live in the per-language unit-test plugins (`qa-unit-tests-python`,
`qa-unit-tests-js`, `qa-unit-tests-jvm`, `qa-unit-tests-net`,
`qa-unit-tests-go-rust`).

## Components

| Type | Name | Description |
|---|---|---|
| Skill | [red-green-refactor](skills/red-green-refactor/SKILL.md) | Test-first loop for any language: write the test list, one failing test seen red for the right reason, smallest change to green, refactor on green, reproduce bugs with a failing test first, and finish with an evidence block of real test output. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-tdd@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
