# qa-unit-tests-go-rust

Go + Rust unit testing in two umbrella skills - one per language, each
centered on the stdlib harness with the community frameworks and mocking
libraries as bundled references. Combined plugin since each language has a
small test surface (stdlib + 1 community library).

Per-framework lifecycle scope. Does **not** duplicate
`qa-test-review` (test code hygiene).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [go-unit-tests](skills/go-unit-tests/SKILL.md) | Go stdlib `testing`: table-driven idiom with t.Run subtests, benchmarks, native fuzzing, coverage, -race CI, and framework choice (stdlib default, Ginkgo if k8s-ecosystem); references cover Ginkgo + Gomega and Go mocking (gomock, testify/mock) |
| Skill | [rust-unit-tests](skills/rust-unit-tests/SKILL.md) | Rust `cargo test`: #[test] / should_panic / Result returns, integration + doc tests, cargo-llvm-cov coverage, Criterion benchmarks, and framework choice (stdlib default, rstest for parameterized cases); references cover rstest and mockall |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-go-rust@testland-qa
```
