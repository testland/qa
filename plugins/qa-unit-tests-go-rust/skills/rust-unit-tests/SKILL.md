---
name: rust-unit-tests
description: "Rust unit testing with the built-in `cargo test` harness - `#[test]` in `#[cfg(test)] mod tests` blocks, `assert_eq!` / `assert_ne!` / `assert!` macros, `#[should_panic(expected)]`, `Result<(), E>` test returns, integration tests in `tests/`, doc tests in `///` comments, runner flags (`--test-threads=1`, `--nocapture`, `--ignored`), `#[ignore]` marking, coverage via cargo-llvm-cov / tarpaulin, and Criterion benchmarks on stable. Includes framework choice (stdlib `#[test]` is the default; rstest for 4+ parameterized case pairs or shared fixtures via references) and test-authoring conventions (inline `#[cfg(test)]` placement, assertion-macro selection, async runtime requirements). References cover rstest parametrize + fixtures and Rust mocking with mockall (`#[automock]` / `mock!`). Use for any Rust unit-test task: writing tests, testing panics or Results, doc tests, coverage gates, benchmarks, or CI wiring."
---

# rust-unit-tests

## Overview

Per [doc.rust-lang.org/book/ch11-00-testing.html][rust-test]:

[rust-test]: https://doc.rust-lang.org/book/ch11-00-testing.html

Rust's testing is built into Cargo - the `#[test]` attribute marks test
functions; `cargo test` discovers and runs them. Three test categories per
the Rust Book:

| Category | Location | Purpose |
|---|---|---|
| Unit tests | Same file as code, in `#[cfg(test)] mod tests { ... }` | Test private + internal logic |
| Integration tests | `tests/` directory at crate root | Test public API as an external user |
| Doc tests | Inside `///` doc comments | Verify documentation examples |

## Choosing a framework

1. **stdlib `#[test]` is the default** - built into the language, no
   `Cargo.toml` change needed.
2. **rstest** when the spec has 4+ input/output case pairs or setup shared
   across 3+ tests - `#[rstest]` + `#[case]` runs each pair as a named
   test, discovered by `cargo test` natively →
   [references/rstest.md](references/rstest.md). Match an existing rstest
   convention (`rstest` in `[dev-dependencies]` AND `#[rstest]` usage in
   tests) rather than introducing it ad hoc.
3. **Mocking trait boundaries** → mockall,
   [references/rust-mocking.md](references/rust-mocking.md).
4. **Property-based invariants** → `proptest-testing` (qa-property-based
   plugin).

## Step 1 - Unit tests

```rust
// src/math.rs
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_two_numbers() {
        assert_eq!(add(1, 2), 3);
    }
}
```

```bash
cargo test                 # all tests
cargo test add             # filter by name pattern
cargo test --lib           # only unit tests in lib
cargo test --all-targets   # everything
cargo test --workspace     # multi-crate workspace
```

`#[cfg(test)]` keeps the module out of release builds.

## Step 2 - Assertion macros

```rust
assert!(condition, "format message: {}", value);
assert_eq!(actual, expected);
assert_ne!(actual, unexpected);
```

`assert_eq!` / `assert_ne!` print BOTH left and right on failure; bare
`assert!(x == y)` only reports `false` ([rust-test][rust-test]). For
diff-rich struct comparisons, the `pretty_assertions` crate colorizes the
output.

## Step 3 - `#[should_panic]` and `Result` returns

```rust
#[test]
#[should_panic(expected = "negative")]
fn specific_panic_message() {
    sqrt(-1.0);
}

#[test]
fn parses_config() -> Result<(), Box<dyn Error>> {
    let cfg = Config::from_file("test/fixtures/config.toml")?;
    assert_eq!(cfg.port, 8080);
    Ok(())
}
```

The `Result` return allows `?` in test bodies - a failing `?` fails the
test with the real error instead of "called unwrap on None".

## Step 4 - Integration tests

```
my-crate/
  src/lib.rs
  tests/
    integration_test.rs    # automatically discovered
    common/mod.rs          # shared helpers (NO mod.rs in tests/ root)
```

Each file in `tests/` compiles to its own binary - slower but
better-isolated; only the crate's public API is visible.

## Step 5 - Doc tests

```rust
/// Adds two numbers.
///
/// # Examples
///
/// ```
/// use my_crate::math::add;
/// assert_eq!(add(1, 2), 3);
/// ```
pub fn add(a: i32, b: i32) -> i32 { a + b }
```

`cargo test --doc` runs only doc tests; `cargo test` runs everything. The
example IS the test, so docs can't drift from the implementation.

## Step 6 - Runner flags and `#[ignore]`

```bash
cargo test -- --test-threads=1           # serial
cargo test -- --nocapture                # show println! output
cargo test -- --ignored                  # only #[ignore]-marked tests
cargo test -- --include-ignored          # ignored + normal
cargo test some_pattern -- --exact       # exact name match
```

```rust
#[test]
#[ignore = "Requires network access"]
fn integration_with_external_api() { ... }
```

Always include the `= "reason"` or ignored tests get forgotten.

## Step 7 - Coverage and benchmarks

Coverage needs an extra crate - `cargo-llvm-cov` (cross-platform,
recommended) or `cargo-tarpaulin` (Linux-only):

```bash
cargo install cargo-llvm-cov
cargo llvm-cov --html
cargo llvm-cov --lcov --output-path coverage.lcov
cargo llvm-cov --fail-under-lines 80     # gate at 80%
```

Benchmarks on stable use Criterion (stdlib `#[bench]` is nightly-only and
breaks CI):

```toml
[dev-dependencies]
criterion = "0.5"

[[bench]]
name = "math_bench"
harness = false
```

```rust
// benches/math_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use my_crate::math::add;

fn bench_add(c: &mut Criterion) {
    c.bench_function("add 1 2", |b| b.iter(|| add(black_box(1), black_box(2))));
}

criterion_group!(benches, bench_add);
criterion_main!(benches);
```

Run `cargo bench` (bheisler.github.io/criterion.rs).

## Step 8 - CI integration

```yaml
- run: cargo test --all-targets --workspace
- run: cargo test --doc
- run: cargo install cargo-llvm-cov
- run: cargo llvm-cov --lcov --output-path coverage.lcov
- uses: codecov/codecov-action@v4
  with: { files: coverage.lcov }
```

## Authoring conventions

When authoring a new unit test in an existing project:

1. **Detect the framework**: stdlib `#[test]` unless `rstest` is in
   `[dev-dependencies]` AND existing tests use `#[rstest]`. Conflicting
   signals → stop and ask.
2. **Placement**: the conventional unit-test idiom is an inline
   `#[cfg(test)] mod tests` block at the end of the source file; use a
   separate `tests/<name>.rs` only for public-API integration scenarios
   (doc.rust-lang.org/cargo/guide/tests).
3. **One spec → one new test function**; never modify existing tests,
   never fabricate symbols the module does not declare, no
   `assert!(true)` smoke asserts when the spec names a concrete value.
4. **Async needs a runtime**: a bare `#[test] fn` calling `.await` does
   not compile - use `#[tokio::test]` (when the project depends on Tokio)
   or rstest's `#[future]` injection
   ([references/rstest.md](references/rstest.md)).
5. **Refuse universally-quantified specs** ("any non-negative price") -
   property-based scope → `proptest-testing` (qa-property-based).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `--all-targets` | Doc tests + benches + examples not run | Always `--all-targets` (Step 1) |
| `unwrap()` in test bodies | Failure message is "called unwrap on None" | `Result<(), E>` return + `?` (Step 3) |
| `#[ignore]` without a reason | Forgotten ignored tests | `= "reason"` (Step 6) |
| `assert!(x == y)` | Loses the value diff on failure | `assert_eq!` (Step 2) |
| Nightly `#[bench]` in CI | Requires nightly toolchain | Criterion on stable (Step 7) |

## Limitations

- No fixture concept beyond `mod tests` shared state (rstest adds
  fixtures - [references/rstest.md](references/rstest.md)).
- Doc tests compile slowly (each is a separate doctest binary).
- No mocking in stdlib - mockall is the community standard
  ([references/rust-mocking.md](references/rust-mocking.md)).
- No parametrize beyond hand-rolled loops or rstest.

## References

- [rust-test][rust-test] - Rust Book Chapter 11 (testing)
- doc.rust-lang.org/cargo/commands/cargo-test.html - `cargo test` reference
- crates.io/crates/cargo-llvm-cov - coverage tool
- bheisler.github.io/criterion.rs - Criterion docs
- [references/rstest.md](references/rstest.md) - rstest parametrize +
  fixtures
- [references/rust-mocking.md](references/rust-mocking.md) - mockall
- `go-unit-tests` - sister umbrella for Go
- `proptest-testing` (qa-property-based) - Rust property-based
- `test-code-conventions` (qa-test-review) - test code hygiene
