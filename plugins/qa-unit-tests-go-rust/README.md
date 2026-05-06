# qa-unit-tests-go-rust

Go + Rust unit testing per-framework wrappers. Combined plugin since each language has a small test surface (stdlib + 1 community library).

**Phase 6 plugin per v2 master plan.** Per-framework lifecycle scope — does NOT duplicate `qa-test-review` test code hygiene.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [go-test](skills/go-test/SKILL.md) | S1 | Go stdlib `testing` package; table-driven idiom; benchmarks; fuzzing (Go 1.18+); examples |
| Skill | [ginkgo-tests](skills/ginkgo-tests/SKILL.md) | S1 | Go BDD framework (Kubernetes-ecosystem standard); Describe/Context/It; Gomega matchers |
| Skill | [cargo-test](skills/cargo-test/SKILL.md) | S1 | Rust `cargo test`; unit + integration + doc tests; Result<>-return for ?; Criterion for benchmarks |
| Skill | [rstest-tests](skills/rstest-tests/SKILL.md) | S1 | Rust parametrize + fixtures; #[case]/#[fixture]; matrix tests; async fixture support |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-go-rust@testland-qa
```

## Rating

All components score >=21 on the v2.0 framework with D6=4 floor. See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md).
