# qa-unit-tests-go-rust

Go + Rust unit testing per-framework wrappers. Combined plugin since each language has a small test surface (stdlib + 1 community library).

Per-framework lifecycle scope. Does **not** duplicate
`qa-test-review` (test code hygiene).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [go-test](skills/go-test/SKILL.md) | Go stdlib `testing` package; table-driven idiom; benchmarks; fuzzing (Go 1.18+); examples |
| Skill | [ginkgo-tests](skills/ginkgo-tests/SKILL.md) | Go BDD framework (Kubernetes-ecosystem standard); Describe/Context/It; Gomega matchers |
| Skill | [cargo-test](skills/cargo-test/SKILL.md) | Rust `cargo test`; unit + integration + doc tests; Result<>-return for ?; Criterion for benchmarks |
| Skill | [rstest-tests](skills/rstest-tests/SKILL.md) | Rust parametrize + fixtures; #[case]/#[fixture]; matrix tests; async fixture support |
| Agent | [go-rust-test-author](agents/go-rust-test-author.md) | Detects language (go.mod vs Cargo.toml) + framework (Go: testing or Ginkgo; Rust: #[test] or rstest), emits one unit test file per spec |
| Agent | [go-rust-framework-selector](agents/go-rust-framework-selector.md) | Detects Go vs Rust and recommends one test framework (stdlib/Ginkgo for Go, cargo-test/rstest for Rust). |
| Skill | [go-rust-mocking](skills/go-rust-mocking/SKILL.md) | Test-double patterns for Go (gomock, testify/mock) and Rust (mockall). |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-go-rust@testland-qa
```
